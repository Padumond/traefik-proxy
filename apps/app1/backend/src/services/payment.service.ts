import Stripe from "stripe";
import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";
import { WalletService } from "./wallet.service";

const prisma = new PrismaClient();

// Initialize Stripe only if API key is provided
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    })
  : null;

export interface PaymentRequest {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: "stripe" | "paypal" | "paystack";
  description?: string;
  metadata?: any;
  email?: string; // Required for Paystack
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  transactionId?: string;
  amount: number;
  currency: string;
  status: string;
  metadata?: any;
}

export class PaymentService {
  /**
   * Create payment intent based on payment method
   */
  static async createPaymentIntent(
    data: PaymentRequest
  ): Promise<PaymentIntent> {
    switch (data.paymentMethod) {
      case "stripe":
        return this.createStripePaymentIntent(data);
      case "paystack":
        return this.createPaystackPaymentIntent(data);
      default:
        throw ApiError.badRequest(
          `Payment method ${data.paymentMethod} not supported`
        );
    }
  }

  /**
   * Create payment intent for Stripe
   */
  static async createStripePaymentIntent(
    data: PaymentRequest
  ): Promise<PaymentIntent> {
    try {
      const { userId, amount, currency, description, metadata } = data;

      // Convert amount to cents for Stripe
      const amountInCents = Math.round(amount * 100);

      // Get user information
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });

      if (!user) {
        throw ApiError.notFound("User not found");
      }

      if (!stripe) {
        throw ApiError.badRequest(
          "Stripe is not configured. Please set STRIPE_SECRET_KEY."
        );
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        description: description || `Credit purchase for ${user.name}`,
        metadata: {
          userId,
          userName: user.name,
          userEmail: user.email,
          ...metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Store payment record in database
      await prisma.payment.create({
        data: {
          userId,
          paymentIntentId: paymentIntent.id,
          amount,
          currency,
          status: "PENDING",
          paymentMethod: "stripe",
          description,
          metadata,
        },
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount,
        currency,
        status: paymentIntent.status,
        paymentMethod: "stripe",
      };
    } catch (error) {
      console.error("Error creating Stripe payment intent:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal("Failed to create payment intent");
    }
  }

  /**
   * Create payment intent for Paystack
   */
  static async createPaystackPaymentIntent(
    data: PaymentRequest
  ): Promise<PaymentIntent> {
    try {
      const { userId, amount, currency, description, metadata, email } = data;

      // Get user information
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });

      if (!user) {
        throw ApiError.notFound("User not found");
      }

      // Use provided email or user's email
      const customerEmail = email || user.email;

      // Convert amount to kobo for Paystack (if currency is NGN) or pesewas for GHS
      const multiplier = currency.toLowerCase() === "ngn" ? 100 : 100; // Both NGN and GHS use 100 subunits
      const amountInSubunits = Math.round(amount * multiplier);

      // Create Paystack transaction
      const paystackResponse = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: customerEmail,
          amount: amountInSubunits,
          currency: currency.toUpperCase(),
          reference: `mas3ndi_${Date.now()}_${userId}`,
          callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
          metadata: {
            userId,
            userName: user.name,
            userEmail: user.email,
            ...metadata,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!paystackResponse.data.status) {
        throw ApiError.internal("Failed to initialize Paystack payment");
      }

      const { reference, authorization_url, access_code } =
        paystackResponse.data.data;

      // Store payment record in database
      await prisma.payment.create({
        data: {
          userId,
          paymentIntentId: reference,
          amount,
          currency,
          status: "PENDING",
          paymentMethod: "paystack",
          description,
          metadata: {
            access_code,
            authorization_url,
            ...metadata,
          },
        },
      });

      return {
        id: reference,
        clientSecret: authorization_url, // Paystack uses authorization URL instead of client secret
        amount,
        currency,
        status: "requires_action", // Paystack requires redirect
        paymentMethod: "paystack",
      };
    } catch (error) {
      console.error("Error creating Paystack payment intent:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || "Paystack API error";
        throw ApiError.internal(`Paystack error: ${message}`);
      }
      throw ApiError.internal("Failed to create Paystack payment intent");
    }
  }

  /**
   * Confirm payment and add credits to wallet
   */
  static async confirmPayment(paymentIntentId: string): Promise<PaymentResult> {
    try {
      // Get payment from database
      const payment = await prisma.payment.findUnique({
        where: { paymentIntentId },
        include: { user: true },
      });

      if (!payment) {
        throw ApiError.notFound("Payment not found");
      }

      if (payment.status === "COMPLETED") {
        throw ApiError.badRequest("Payment already completed");
      }

      if (!stripe) {
        throw ApiError.badRequest(
          "Stripe is not configured. Please set STRIPE_SECRET_KEY."
        );
      }

      // Verify payment with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      if (paymentIntent.status !== "succeeded") {
        throw ApiError.badRequest("Payment not successful");
      }

      // Update payment status and add credits to wallet
      const result = await prisma.$transaction(async (tx) => {
        // Update payment status
        const updatedPayment = await tx.payment.update({
          where: { paymentIntentId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            stripeChargeId: paymentIntent.latest_charge as string,
          },
        });

        // Add credits to user wallet
        const transaction = await WalletService.createEnhancedTransaction({
          userId: payment.userId,
          type: "CREDIT",
          amount: payment.amount,
          description: `Wallet topup via ${payment.paymentMethod}`,
          reference: paymentIntentId,
          metadata: {
            paymentId: payment.id,
            paymentMethod: payment.paymentMethod,
            stripeChargeId: paymentIntent.latest_charge,
          },
        });

        return { payment: updatedPayment, transaction };
      });

      return {
        success: true,
        paymentId: payment.id,
        transactionId: result.transaction.id,
        amount: payment.amount,
        currency: payment.currency,
        status: "COMPLETED",
        metadata: payment.metadata,
      };
    } catch (error) {
      console.error("Error confirming payment:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal("Failed to confirm payment");
    }
  }

  /**
   * Handle Stripe webhook events
   */
  static async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case "payment_intent.succeeded":
          await this.handlePaymentSucceeded(
            event.data.object as Stripe.PaymentIntent
          );
          break;
        case "payment_intent.payment_failed":
          await this.handlePaymentFailed(
            event.data.object as Stripe.PaymentIntent
          );
          break;
        case "charge.dispute.created":
          await this.handleChargeDispute(event.data.object as Stripe.Dispute);
          break;
        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (error) {
      console.error("Error handling Stripe webhook:", error);
      throw error;
    }
  }

  /**
   * Handle Paystack webhook events
   */
  static async handlePaystackWebhook(event: any): Promise<void> {
    try {
      switch (event.event) {
        case "charge.success":
          await this.handlePaystackPaymentSucceeded(event.data);
          break;
        case "charge.failed":
          await this.handlePaystackPaymentFailed(event.data);
          break;
        default:
          console.log(`Unhandled Paystack event type: ${event.event}`);
      }
    } catch (error) {
      console.error("Error handling Paystack webhook:", error);
      throw error;
    }
  }

  /**
   * Handle successful Paystack payment
   */
  private static async handlePaystackPaymentSucceeded(
    data: any
  ): Promise<void> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { paymentIntentId: data.reference },
      });

      if (!payment || payment.status === "COMPLETED") {
        return; // Already processed or not found
      }

      // Update payment status and add credits to wallet
      const result = await prisma.$transaction(async (tx) => {
        // Update payment status
        const updatedPayment = await tx.payment.update({
          where: { paymentIntentId: data.reference },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            metadata: {
              ...((payment.metadata as object) || {}),
              paystackTransactionId: data.id,
              paystackReference: data.reference,
            },
          },
        });

        // Add credits to user wallet
        const transaction = await WalletService.createEnhancedTransaction({
          userId: payment.userId,
          type: "CREDIT",
          amount: payment.amount,
          description: `Wallet topup via ${payment.paymentMethod}`,
          reference: data.reference,
          metadata: {
            paymentId: payment.id,
            paymentMethod: payment.paymentMethod,
            paystackTransactionId: data.id,
          },
        });

        return { payment: updatedPayment, transaction };
      });

      console.log(`Paystack payment succeeded: ${data.reference}`);
    } catch (error) {
      console.error("Error handling Paystack payment succeeded:", error);
    }
  }

  /**
   * Handle failed Paystack payment
   */
  private static async handlePaystackPaymentFailed(data: any): Promise<void> {
    try {
      await prisma.payment.update({
        where: { paymentIntentId: data.reference },
        data: {
          status: "FAILED",
          metadata: {
            paystackTransactionId: data.id,
            paystackReference: data.reference,
            failureReason: data.gateway_response,
          },
        },
      });

      console.log(`Paystack payment failed: ${data.reference}`);
    } catch (error) {
      console.error("Error handling Paystack payment failed:", error);
    }
  }

  /**
   * Handle successful payment
   */
  private static async handlePaymentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { paymentIntentId: paymentIntent.id },
      });

      if (!payment || payment.status === "COMPLETED") {
        return; // Already processed or not found
      }

      await this.confirmPayment(paymentIntent.id);
    } catch (error) {
      console.error("Error handling payment succeeded:", error);
    }
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    try {
      await prisma.payment.updateMany({
        where: { paymentIntentId: paymentIntent.id },
        data: {
          status: "FAILED",
          failureReason: paymentIntent.last_payment_error?.message,
        },
      });
    } catch (error) {
      console.error("Error handling payment failed:", error);
    }
  }

  /**
   * Handle charge dispute
   */
  private static async handleChargeDispute(
    dispute: Stripe.Dispute
  ): Promise<void> {
    try {
      const chargeId = dispute.charge as string;

      await prisma.payment.updateMany({
        where: { stripeChargeId: chargeId },
        data: {
          status: "DISPUTED",
          metadata: {
            disputeId: dispute.id,
            disputeReason: dispute.reason,
            disputeAmount: dispute.amount,
          },
        },
      });

      // TODO: Notify admin about dispute
    } catch (error) {
      console.error("Error handling charge dispute:", error);
    }
  }

  /**
   * Get payment history for a user
   */
  static async getPaymentHistory(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    payments: any[];
    total: number;
    summary: {
      totalAmount: number;
      successfulPayments: number;
      failedPayments: number;
    };
  }> {
    try {
      const { limit = 50, offset = 0, status, startDate, endDate } = options;

      const whereClause: any = { userId };
      if (status) whereClause.status = status;
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const [payments, total, summary] = await Promise.all([
        prisma.payment.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.payment.count({ where: whereClause }),
        prisma.payment.aggregate({
          where: { ...whereClause, status: "COMPLETED" },
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);

      const failedCount = await prisma.payment.count({
        where: { ...whereClause, status: "FAILED" },
      });

      return {
        payments,
        total,
        summary: {
          totalAmount: summary._sum.amount || 0,
          successfulPayments: summary._count.id,
          failedPayments: failedCount,
        },
      };
    } catch (error) {
      console.error("Error getting payment history:", error);
      throw ApiError.internal("Failed to get payment history");
    }
  }

  /**
   * Refund a payment
   */
  static async refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<PaymentResult> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw ApiError.notFound("Payment not found");
      }

      if (payment.status !== "COMPLETED") {
        throw ApiError.badRequest("Can only refund completed payments");
      }

      if (!payment.stripeChargeId) {
        throw ApiError.badRequest("No charge ID found for refund");
      }

      if (!stripe) {
        throw ApiError.badRequest(
          "Stripe is not configured. Please set STRIPE_SECRET_KEY."
        );
      }

      // Create refund with Stripe
      const refund = await stripe.refunds.create({
        charge: payment.stripeChargeId,
        amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
        reason: reason as any,
        metadata: {
          paymentId,
          originalAmount: payment.amount.toString(),
        },
      });

      // Update payment status and create debit transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update payment status
        const updatedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: "REFUNDED",
            refundId: refund.id,
            refundAmount: (refund.amount || 0) / 100,
            refundReason: reason,
          },
        });

        // Create debit transaction to remove credits
        const refundAmount = (refund.amount || 0) / 100;
        const transaction = await WalletService.createEnhancedTransaction({
          userId: payment.userId,
          type: "DEBIT",
          amount: refundAmount,
          description: `Refund for payment ${paymentId}`,
          reference: refund.id,
          metadata: {
            paymentId,
            refundId: refund.id,
            refundReason: reason,
          },
        });

        // Complete the debit transaction
        await WalletService.completeTransaction(transaction.id);

        return { payment: updatedPayment, transaction };
      });

      return {
        success: true,
        paymentId,
        transactionId: result.transaction.id,
        amount: (refund.amount || 0) / 100,
        currency: payment.currency,
        status: "REFUNDED",
      };
    } catch (error) {
      console.error("Error refunding payment:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal("Failed to refund payment");
    }
  }

  /**
   * Get payment statistics
   */
  static async getPaymentStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRevenue: number;
    totalPayments: number;
    averagePayment: number;
    successRate: number;
    refundRate: number;
    topPaymentMethods: Array<{ method: string; count: number; amount: number }>;
  }> {
    try {
      const whereClause: any = {};
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const [
        totalStats,
        successfulStats,
        failedStats,
        refundedStats,
        methodStats,
      ] = await Promise.all([
        prisma.payment.aggregate({
          where: whereClause,
          _sum: { amount: true },
          _count: { id: true },
          _avg: { amount: true },
        }),
        prisma.payment.count({
          where: { ...whereClause, status: "COMPLETED" },
        }),
        prisma.payment.count({
          where: { ...whereClause, status: "FAILED" },
        }),
        prisma.payment.count({
          where: { ...whereClause, status: "REFUNDED" },
        }),
        prisma.payment.groupBy({
          by: ["paymentMethod"],
          where: { ...whereClause, status: "COMPLETED" },
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);

      const totalPayments = totalStats._count.id;
      const successRate =
        totalPayments > 0 ? (successfulStats / totalPayments) * 100 : 0;
      const refundRate =
        successfulStats > 0 ? (refundedStats / successfulStats) * 100 : 0;

      const topPaymentMethods = methodStats.map((stat) => ({
        method: stat.paymentMethod,
        count: stat._count.id,
        amount: stat._sum.amount || 0,
      }));

      return {
        totalRevenue: totalStats._sum.amount || 0,
        totalPayments,
        averagePayment: totalStats._avg.amount || 0,
        successRate,
        refundRate,
        topPaymentMethods,
      };
    } catch (error) {
      console.error("Error getting payment statistics:", error);
      throw ApiError.internal("Failed to get payment statistics");
    }
  }

  /**
   * Verify payment with Paystack
   */
  static async verifyPayment(reference: string) {
    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: response.data.status,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error: any) {
      console.error(
        "Paystack verification error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Payment verification failed",
      };
    }
  }
}
