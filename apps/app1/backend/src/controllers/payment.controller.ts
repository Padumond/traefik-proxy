import { Request, Response, NextFunction } from "express";
import { PaymentService } from "../services/payment.service";
import { ApiError } from "../middleware/error.middleware";
import Stripe from "stripe";

export class PaymentController {
  /**
   * Create payment intent
   */
  static async createPaymentIntent(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized("Authentication required");
      }

      const {
        amount,
        currency = "USD",
        paymentMethod = "stripe",
        description,
        metadata,
      } = req.body;

      if (!amount || amount <= 0) {
        throw ApiError.badRequest("Valid amount is required");
      }

      if (amount < 1) {
        throw ApiError.badRequest("Minimum payment amount is $1.00");
      }

      if (amount > 10000) {
        throw ApiError.badRequest("Maximum payment amount is $10,000.00");
      }

      if (!["stripe", "paypal", "paystack"].includes(paymentMethod)) {
        throw ApiError.badRequest(
          "Payment method must be stripe, paypal, or paystack"
        );
      }

      const paymentIntent = await PaymentService.createPaymentIntent({
        userId,
        amount,
        currency,
        paymentMethod,
        description,
        metadata,
      });

      res.status(201).json({
        success: true,
        message: "Payment intent created successfully",
        data: paymentIntent,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm payment
   */
  static async confirmPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentIntentId } = req.params;

      if (!paymentIntentId) {
        throw ApiError.badRequest("Payment intent ID is required");
      }

      const result = await PaymentService.confirmPayment(paymentIntentId);

      res.json({
        success: true,
        message: "Payment confirmed successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Paystack webhook
   */
  static async handlePaystackWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const hash = req.headers["x-paystack-signature"] as string;
      const body = JSON.stringify(req.body);

      // Debug: Log environment variable (remove in production)
      console.log(
        "Paystack Secret Key:",
        process.env.PAYSTACK_SECRET_KEY ? "Loaded" : "Missing"
      );

      // Verify webhook signature
      const crypto = require("crypto");
      const expectedHash = crypto
        .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
        .update(body)
        .digest("hex");

      if (hash !== expectedHash) {
        throw ApiError.badRequest("Invalid webhook signature");
      }

      await PaymentService.handlePaystackWebhook(req.body);

      res.json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment history
   */
  static async getPaymentHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized("Authentication required");
      }

      const { limit, offset, status, startDate, endDate } = req.query;

      const options: any = {};
      if (limit) options.limit = parseInt(limit as string);
      if (offset) options.offset = parseInt(offset as string);
      if (status) options.status = status as string;
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);

      const history = await PaymentService.getPaymentHistory(userId, options);

      res.json({
        success: true,
        message: "Payment history retrieved successfully",
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Stripe webhook
   */
  static async handleStripeWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const sig = req.headers["stripe-signature"] as string;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!endpointSecret) {
        throw ApiError.internal("Stripe webhook secret not configured");
      }

      let event: Stripe.Event;

      try {
        event = Stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        throw ApiError.badRequest("Invalid webhook signature");
      }

      await PaymentService.handleStripeWebhook(event);

      res.json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refund payment (admin only)
   */
  static async refundPayment(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role !== "ADMIN") {
        throw ApiError.forbidden("Admin access required");
      }

      const { paymentId } = req.params;
      const { amount, reason } = req.body;

      if (!paymentId) {
        throw ApiError.badRequest("Payment ID is required");
      }

      if (amount && amount <= 0) {
        throw ApiError.badRequest("Refund amount must be positive");
      }

      const result = await PaymentService.refundPayment(
        paymentId,
        amount,
        reason
      );

      res.json({
        success: true,
        message: "Payment refunded successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment statistics (admin only)
   */
  static async getPaymentStatistics(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (req.user?.role !== "ADMIN") {
        throw ApiError.forbidden("Admin access required");
      }

      const { startDate, endDate } = req.query;

      const options: any = {};
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);

      const statistics = await PaymentService.getPaymentStatistics(
        options.startDate,
        options.endDate
      );

      res.json({
        success: true,
        message: "Payment statistics retrieved successfully",
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all payments (admin only)
   */
  static async getAllPayments(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role !== "ADMIN") {
        throw ApiError.forbidden("Admin access required");
      }

      const {
        limit = "50",
        offset = "0",
        status,
        paymentMethod,
        startDate,
        endDate,
        userId,
      } = req.query;

      // This would typically use a more comprehensive admin service
      // For now, we'll use a simplified approach
      const options: any = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };

      if (status) options.status = status as string;
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);

      // If userId is provided, get payments for that user
      const targetUserId = (userId as string) || undefined;
      const history = await PaymentService.getPaymentHistory(
        targetUserId!,
        options
      );

      res.json({
        success: true,
        message: "All payments retrieved successfully",
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment details
   */
  static async getPaymentDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { paymentId } = req.params;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === "ADMIN";

      if (!paymentId) {
        throw ApiError.badRequest("Payment ID is required");
      }

      // This would typically be implemented in the PaymentService
      // For now, returning a placeholder response
      res.json({
        success: true,
        message: "Payment details retrieved successfully",
        data: {
          id: paymentId,
          // Additional payment details would be fetched here
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel payment intent
   */
  static async cancelPaymentIntent(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { paymentIntentId } = req.params;
      const userId = req.user?.id;

      if (!paymentIntentId) {
        throw ApiError.badRequest("Payment intent ID is required");
      }

      // This would typically be implemented in the PaymentService
      // For now, returning a placeholder response
      res.json({
        success: true,
        message: "Payment intent cancelled successfully",
        data: {
          paymentIntentId,
          status: "cancelled",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment receipts
   */
  static async getPaymentReceipts(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized("Authentication required");
      }

      const {
        page = "1",
        limit = "10",
        status,
        startDate,
        endDate,
      } = req.query;

      const options: any = {
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
      };

      if (status) options.status = status as string;
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);

      // Get payment history and format as receipts
      const history = await PaymentService.getPaymentHistory(userId, options);

      // Transform payment history into receipt format
      const receipts =
        history.payments?.map((payment: any) => ({
          id: payment.id,
          transactionId: payment.id,
          amount: payment.amount,
          currency: payment.currency || "GHS",
          paymentMethod: payment.paymentMethod || "Unknown",
          status: payment.status,
          createdAt: payment.createdAt,
          description: payment.description || "Payment",
          downloadUrl: `/api/payments/receipts/${payment.id}/download`,
          metadata: payment.metadata || {},
        })) || [];

      res.json({
        success: true,
        message: "Payment receipts retrieved successfully",
        data: receipts,
        total: history.total || 0,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get supported payment methods
   */
  static async getSupportedPaymentMethods(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const paymentMethods = [
        {
          id: "stripe",
          name: "Credit/Debit Card",
          description: "Pay with Visa, Mastercard, American Express, and more",
          fees: {
            percentage: 2.9,
            fixed: 0.3,
          },
          currencies: ["USD", "EUR", "GBP"],
          minAmount: 1.0,
          maxAmount: 10000.0,
        },
        {
          id: "paypal",
          name: "PayPal",
          description: "Pay with your PayPal account",
          fees: {
            percentage: 3.49,
            fixed: 0.49,
          },
          currencies: ["USD", "EUR", "GBP"],
          minAmount: 1.0,
          maxAmount: 10000.0,
          enabled: false, // Not implemented yet
        },
      ];

      res.json({
        success: true,
        message: "Supported payment methods retrieved successfully",
        data: paymentMethods,
      });
    } catch (error) {
      next(error);
    }
  }
}
