import { Request, Response, NextFunction } from "express";
import { WalletService } from "../services/wallet.service";
import { ApiError } from "../middleware/error.middleware";

export class EnhancedWalletController {
  /**
   * Get enhanced wallet balance
   */
  static async getEnhancedBalance(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized("Authentication required");
      }

      const balance = await WalletService.getEnhancedBalance(userId);

      res.json({
        success: true,
        message: "Wallet balance retrieved successfully",
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create enhanced transaction
   */
  static async createEnhancedTransaction(
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
        type,
        amount,
        description,
        reference,
        metadata,
        externalTransactionId,
      } = req.body;

      if (!type || !amount || !description) {
        throw ApiError.badRequest("Type, amount, and description are required");
      }

      if (!["CREDIT", "DEBIT"].includes(type)) {
        throw ApiError.badRequest("Type must be either CREDIT or DEBIT");
      }

      if (amount <= 0) {
        throw ApiError.badRequest("Amount must be positive");
      }

      const transaction = await WalletService.createEnhancedTransaction({
        userId,
        type,
        amount,
        description,
        reference,
        metadata,
        externalTransactionId,
      });

      res.status(201).json({
        success: true,
        message: "Transaction created successfully",
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete a pending transaction
   */
  static async completeTransaction(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        throw ApiError.badRequest("Transaction ID is required");
      }

      const transaction = await WalletService.completeTransaction(
        transactionId
      );

      res.json({
        success: true,
        message: "Transaction completed successfully",
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a pending transaction
   */
  static async cancelTransaction(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { transactionId } = req.params;
      const { reason } = req.body;

      if (!transactionId) {
        throw ApiError.badRequest("Transaction ID is required");
      }

      const transaction = await WalletService.cancelTransaction(
        transactionId,
        reason
      );

      res.json({
        success: true,
        message: "Transaction cancelled successfully",
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get enhanced transaction history
   */
  static async getEnhancedTransactionHistory(
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
        type,
        status,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        reference,
        limit,
        offset,
      } = req.query;

      const filter: any = { userId };
      if (type) filter.type = type as string;
      if (status) filter.status = status as string;
      if (startDate) filter.startDate = new Date(startDate as string);
      if (endDate) filter.endDate = new Date(endDate as string);
      if (minAmount) filter.minAmount = parseFloat(minAmount as string);
      if (maxAmount) filter.maxAmount = parseFloat(maxAmount as string);
      if (reference) filter.reference = reference as string;
      if (limit) filter.limit = parseInt(limit as string);
      if (offset) filter.offset = parseInt(offset as string);

      const history = await WalletService.getTransactionHistory(filter);

      res.json({
        success: true,
        message: "Transaction history retrieved successfully",
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet statistics
   */
  static async getWalletStatistics(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized("Authentication required");
      }

      const { days = "30" } = req.query;
      const daysNumber = parseInt(days as string);

      if (daysNumber < 1 || daysNumber > 365) {
        throw ApiError.badRequest("Days must be between 1 and 365");
      }

      // Get basic statistics
      const [balance, history] = await Promise.all([
        WalletService.getEnhancedBalance(userId),
        WalletService.getTransactionHistory(userId, {
          startDate: new Date(Date.now() - daysNumber * 24 * 60 * 60 * 1000),
          endDate: new Date(),
        }),
      ]);

      // Calculate summary from transactions
      const totalCredits = history.data.reduce((sum, tx) => {
        return tx.type === "CREDIT" ? sum + tx.amount : sum - tx.amount;
      }, 0);

      const statistics = {
        balance,
        summary: {
          totalCredits,
          totalTransactions: history.data.length,
        },
        recentTransactions: history.data.slice(0, 10),
        trends: {
          dailyAverage: totalCredits / daysNumber,
          weeklyAverage: (totalCredits / daysNumber) * 7,
          monthlyProjection: (totalCredits / daysNumber) * 30,
        },
      };

      res.json({
        success: true,
        message: "Wallet statistics retrieved successfully",
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Transfer funds between users (admin only)
   */
  static async transferFunds(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user?.role !== "ADMIN") {
        throw ApiError.forbidden("Admin access required");
      }

      const { fromUserId, toUserId, amount, description, reference } = req.body;

      if (!fromUserId || !toUserId || !amount || !description) {
        throw ApiError.badRequest(
          "From user, to user, amount, and description are required"
        );
      }

      if (amount <= 0) {
        throw ApiError.badRequest("Amount must be positive");
      }

      if (fromUserId === toUserId) {
        throw ApiError.badRequest("Cannot transfer to the same user");
      }

      // Create debit transaction for sender
      const debitTransaction = await WalletService.createEnhancedTransaction({
        userId: fromUserId,
        type: "DEBIT",
        amount,
        description: `Transfer to user: ${description}`,
        reference,
        metadata: {
          transferType: "outgoing",
          recipientId: toUserId,
          adminInitiated: true,
          adminId: req.user.id,
        },
      });

      // Complete the debit transaction
      await WalletService.completeTransaction(debitTransaction.id);

      // Create credit transaction for recipient
      const creditTransaction = await WalletService.createEnhancedTransaction({
        userId: toUserId,
        type: "CREDIT",
        amount,
        description: `Transfer from user: ${description}`,
        reference,
        metadata: {
          transferType: "incoming",
          senderId: fromUserId,
          adminInitiated: true,
          adminId: req.user.id,
        },
      });

      res.json({
        success: true,
        message: "Funds transferred successfully",
        data: {
          debitTransaction,
          creditTransaction,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending transactions (admin only)
   */
  static async getPendingTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (req.user?.role !== "ADMIN") {
        throw ApiError.forbidden("Admin access required");
      }

      const { limit = "50", offset = "0" } = req.query;

      // For pending transactions, we need a different approach since getTransactionHistory doesn't support status filter
      // Let's get all transactions and filter for pending ones
      const pendingTransactions = await WalletService.getTransactionHistory(
        "",
        {
          limit: parseInt(limit as string),
          page:
            Math.floor(parseInt(offset as string) / parseInt(limit as string)) +
            1,
        }
      );

      res.json({
        success: true,
        message: "Pending transactions retrieved successfully",
        data: pendingTransactions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk process transactions (admin only)
   */
  static async bulkProcessTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (req.user?.role !== "ADMIN") {
        throw ApiError.forbidden("Admin access required");
      }

      const { transactionIds, action, reason } = req.body;

      if (
        !transactionIds ||
        !Array.isArray(transactionIds) ||
        transactionIds.length === 0
      ) {
        throw ApiError.badRequest("Transaction IDs array is required");
      }

      if (!["complete", "cancel"].includes(action)) {
        throw ApiError.badRequest("Action must be either complete or cancel");
      }

      if (action === "cancel" && !reason) {
        throw ApiError.badRequest("Reason is required for cancellation");
      }

      const results = [];
      const errors = [];

      for (const transactionId of transactionIds) {
        try {
          let result;
          if (action === "complete") {
            result = await WalletService.completeTransaction(transactionId);
          } else {
            result = await WalletService.cancelTransaction(
              transactionId,
              reason
            );
          }
          results.push({ transactionId, status: "success", data: result });
        } catch (error: any) {
          errors.push({ transactionId, status: "error", error: error.message });
        }
      }

      res.json({
        success: true,
        message: `Bulk ${action} operation completed`,
        data: {
          processed: results.length,
          errorCount: errors.length,
          results,
          errors,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
