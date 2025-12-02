import { Request, Response, NextFunction } from "express";
import { ApiError } from "../middleware/error.middleware";
import { SmsPackagesService } from "../services/smsPackages.service";
import { prisma } from "../server";
// import { PaymentService } from '../services/payment.service';

export class SmsPackagesController {
  /**
   * Get all active SMS packages
   */
  static async getPackages(req: Request, res: Response, next: NextFunction) {
    try {
      const packages = await SmsPackagesService.getActivePackages();

      res.json({
        success: true,
        message: "SMS packages retrieved successfully",
        data: packages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get package by ID
   */
  static async getPackageById(req: Request, res: Response, next: NextFunction) {
    try {
      const { packageId } = req.params;

      if (!packageId) {
        throw ApiError.badRequest("Package ID is required");
      }

      const package_ = await SmsPackagesService.getPackageById(packageId);

      res.json({
        success: true,
        message: "SMS package retrieved successfully",
        data: package_,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create SMS package (Admin only)
   */
  static async createPackage(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, credits, price, currency, isPopular } =
        req.body;

      if (!name || !credits || !price) {
        throw ApiError.badRequest("Name, credits, and price are required");
      }

      const package_ = await SmsPackagesService.createPackage({
        name,
        description,
        credits: parseInt(credits),
        price: parseFloat(price),
        currency,
        isPopular: Boolean(isPopular),
      });

      res.status(201).json({
        success: true,
        message: "SMS package created successfully",
        data: package_,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Purchase SMS package
   */
  static async purchasePackage(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const { packageId } = req.params;
      const { paymentMethod = "paystack", email } = req.body;

      if (!userId) {
        throw ApiError.unauthorized("Authentication required");
      }

      if (!packageId) {
        throw ApiError.badRequest("Package ID is required");
      }

      if (!["stripe", "paystack"].includes(paymentMethod)) {
        throw ApiError.badRequest("Payment method must be stripe or paystack");
      }

      // Get package details
      const package_ = await SmsPackagesService.getPackageById(packageId);

      // Payment integration temporarily disabled
      res.status(501).json({
        success: false,
        message: "Payment integration temporarily disabled",
        data: {
          package: package_,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete package purchase (after successful payment)
   */
  static async completePurchase(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const { packageId } = req.params;
      const { paymentReference, paymentMethod = "paystack" } = req.body;

      if (!userId) {
        throw ApiError.unauthorized("Authentication required");
      }

      if (!packageId || !paymentReference) {
        throw ApiError.badRequest(
          "Package ID and payment reference are required"
        );
      }

      // Complete the purchase
      const purchase = await SmsPackagesService.purchasePackage({
        userId,
        packageId,
        paymentMethod,
        paymentReference,
      });

      // Get updated user balance
      const balance = await SmsPackagesService.getUserBalance(userId);

      res.json({
        success: true,
        message: "Package purchased successfully",
        data: {
          purchase,
          newBalance: balance.balance,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's SMS balance
   */
  static async getUserBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized("Authentication required");
      }

      const balance = await SmsPackagesService.getUserBalance(userId);

      res.json({
        success: true,
        message: "User balance retrieved successfully",
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's purchase history
   */
  static async getPurchaseHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!userId) {
        throw ApiError.unauthorized("Authentication required");
      }

      const history = await SmsPackagesService.getUserPurchases(
        userId,
        page,
        limit
      );

      res.json({
        success: true,
        message: "Purchase history retrieved successfully",
        data: history.purchases,
        pagination: history.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update SMS package (Admin only)
   */
  static async updatePackage(req: Request, res: Response, next: NextFunction) {
    try {
      const { packageId } = req.params;
      const updates = req.body;

      if (!packageId) {
        throw ApiError.badRequest("Package ID is required");
      }

      const package_ = await SmsPackagesService.updatePackage(
        packageId,
        updates
      );

      res.json({
        success: true,
        message: "SMS package updated successfully",
        data: package_,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete SMS package (Admin only)
   */
  static async deletePackage(req: Request, res: Response, next: NextFunction) {
    try {
      const { packageId } = req.params;

      if (!packageId) {
        throw ApiError.badRequest("Package ID is required");
      }

      await SmsPackagesService.deletePackage(packageId);

      res.json({
        success: true,
        message: "SMS package deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Purchase custom SMS package
   */
  static async purchaseCustomPackage(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const { amount, paymentMethod = "paystack", email } = req.body;

      if (!userId) {
        throw ApiError.unauthorized("Authentication required");
      }

      if (!amount || amount <= 0) {
        throw ApiError.badRequest("Amount must be greater than 0");
      }

      if (amount < 5) {
        throw ApiError.badRequest("Minimum custom package amount is GH₵5");
      }

      if (!["stripe", "paystack"].includes(paymentMethod)) {
        throw ApiError.badRequest("Payment method must be stripe or paystack");
      }

      // Calculate SMS credits based on standard rate (0.059 GHS per SMS)
      const BASE_SMS_RATE = 0.059;
      const credits = Math.floor(amount / BASE_SMS_RATE);

      // Create a temporary custom package
      const customPackage = {
        id: `custom-${Date.now()}`,
        name: `Custom Package - GH₵${amount}`,
        description: `Custom SMS package for GH₵${amount} (${credits} credits)`,
        credits,
        price: amount,
        currency: "GHS",
        isActive: true,
        isPopular: false,
      };

      // For now, simulate payment intent creation
      // In production, integrate with actual payment providers
      const paymentIntent = {
        id: `pi_custom_${Date.now()}`,
        clientSecret: `custom_payment_${Date.now()}`,
        amount: amount * 100, // Convert to pesewas for Paystack
        currency: "GHS",
        status: "requires_payment_method",
        paymentMethod,
      };

      res.json({
        success: true,
        message: "Custom package payment initiated",
        data: {
          paymentIntent,
          package: customPackage,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle successful Paystack payment for SMS packages
   */
  static async handlePaystackSuccess(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { reference, amount, metadata } = req.body;

      if (!reference || !amount || !metadata) {
        throw ApiError.badRequest("Missing required payment data");
      }

      const { user_id, sms_credits, package_type, package_name } = metadata;

      if (!user_id || !sms_credits) {
        throw ApiError.badRequest("Missing user or SMS credits information");
      }

      // Update user's SMS credits (not wallet balance)
      const updatedUser = await prisma.user.update({
        where: { id: user_id },
        data: {
          smsCredits: {
            increment: parseInt(sms_credits), // Add SMS credits to the user's account
          },
        },
      });

      // For custom packages, create or find a custom package entry
      let customPackage = await prisma.smsPackage.findFirst({
        where: { name: "Custom Package" },
      });

      if (!customPackage) {
        customPackage = await prisma.smsPackage.create({
          data: {
            name: "Custom Package",
            description: "User-defined custom SMS package",
            credits: 0, // Variable credits
            price: 0, // Variable price
            currency: "GHS",
            isActive: true,
            isPopular: false,
          },
        });
      }

      // Create credit transaction record for SMS credits purchase
      await prisma.creditTransaction.create({
        data: {
          userId: user_id,
          amount: parseInt(sms_credits), // SMS credits amount
          balance: updatedUser.smsCredits, // New SMS credits balance
          type: "PURCHASE",
          description: `SMS credits purchase - ${package_name}`,
          referenceId: reference,
          metadata: {
            payment_amount_ghs: parseFloat(amount) / 100,
            payment_method: "paystack",
            package_type: package_type,
            package_name: package_name,
          },
        },
      });

      // Create purchase record
      const purchase = await prisma.packagePurchase.create({
        data: {
          userId: user_id,
          packageId: customPackage.id,
          creditsReceived: parseInt(sms_credits),
          amountPaid: parseFloat(amount) / 100, // Convert from kobo/pesewas to main currency
          currency: "GHS",
          paymentMethod: "paystack",
          paymentReference: reference,
          status: "COMPLETED",
        },
      });

      res.json({
        success: true,
        message: "SMS credits added successfully",
        data: {
          newSmsCredits: updatedUser.smsCredits,
          creditsAdded: parseInt(sms_credits),
          amountPaid: parseFloat(amount) / 100,
          purchase,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Purchase SMS credits using wallet balance
   */
  static async purchaseCreditsWithWallet(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const { credits, packageName } = req.body;

      if (!userId) {
        throw ApiError.unauthorized("User not authenticated");
      }

      if (!credits || credits <= 0) {
        throw ApiError.badRequest("Invalid credits amount");
      }

      // Calculate cost based on standard rate (1 credit = 0.059 GHS)
      const CREDIT_RATE = 0.059; // 1 SMS credit = 0.059 GHS
      const totalCost = credits * CREDIT_RATE;

      // Get user's current wallet balance
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true, smsCredits: true },
      });

      if (!user) {
        throw ApiError.notFound("User not found");
      }

      if (user.walletBalance < totalCost) {
        throw ApiError.badRequest(
          `Insufficient wallet balance. Required: ₵${totalCost.toFixed(
            2
          )}, Available: ₵${user.walletBalance.toFixed(2)}`
        );
      }

      // Update user's balances in a transaction
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          walletBalance: {
            decrement: totalCost, // Deduct from wallet balance
          },
          smsCredits: {
            increment: credits, // Add SMS credits
          },
        },
      });

      // Create wallet transaction for the debit
      await prisma.walletTransaction.create({
        data: {
          userId,
          amount: -totalCost, // Negative amount for debit
          type: "DEBIT",
          description: `SMS credits purchase using wallet balance - ${
            packageName || "Custom"
          }`,
          status: "COMPLETED",
        },
      });

      // Create credit transaction for the SMS credits purchase
      await prisma.creditTransaction.create({
        data: {
          userId,
          amount: credits,
          balance: updatedUser.smsCredits, // New SMS credits balance
          type: "PURCHASE",
          description: `SMS credits purchase using wallet balance - ${
            packageName || "Custom"
          }`,
          referenceId: `wallet_${Date.now()}`,
          metadata: {
            payment_amount_ghs: totalCost,
            payment_method: "wallet_balance",
            package_name: packageName || "Custom",
            credit_rate: CREDIT_RATE,
          },
        },
      });

      // Create purchase record
      let customPackage = await prisma.smsPackage.findFirst({
        where: { name: "Wallet Purchase" },
      });

      if (!customPackage) {
        customPackage = await prisma.smsPackage.create({
          data: {
            name: "Wallet Purchase",
            description: "SMS credits purchased using wallet balance",
            credits: 0, // Variable credits
            price: 0, // Variable price
            currency: "GHS",
            isActive: true,
            isPopular: false,
          },
        });
      }

      const purchase = await prisma.packagePurchase.create({
        data: {
          userId,
          packageId: customPackage.id,
          creditsReceived: credits,
          amountPaid: totalCost,
          currency: "GHS",
          paymentMethod: "wallet_balance",
          paymentReference: `wallet_${Date.now()}`,
          status: "COMPLETED",
        },
      });

      res.json({
        success: true,
        message: "SMS credits purchased successfully using wallet balance",
        data: {
          newWalletBalance: updatedUser.walletBalance,
          newSmsCredits: updatedUser.smsCredits,
          creditsAdded: credits,
          amountDeducted: totalCost,
          creditRate: CREDIT_RATE,
          purchase,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
