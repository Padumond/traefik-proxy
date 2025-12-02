import { Request, Response, NextFunction } from "express";
import { WalletService } from "../services/wallet.service";
import { ApiError } from "../middleware/error.middleware";

export class ClientWalletController {
  /**
   * Get wallet balance via client API
   */
  static async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).clientApiInfo;

      const balance = await WalletService.getWalletBalance(userId);

      res.status(200).json({
        success: true,
        data: {
          balance: balance,
          currency: "USD",
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to retrieve balance",
        },
      });
    }
  }

  /**
   * Get wallet transaction history
   */
  static async getTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).clientApiInfo;
      const { page = 1, limit = 20, type, from_date, to_date } = req.query;

      const filters: any = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100), // Max 100 per page
      };

      if (
        type &&
        ["CREDIT", "DEBIT"].includes((type as string).toUpperCase())
      ) {
        filters.type = (type as string).toUpperCase();
      }

      if (from_date) {
        filters.startDate = new Date(from_date as string);
      }

      if (to_date) {
        filters.endDate = new Date(to_date as string);
      }

      const result = await WalletService.getTransactionHistory(userId, filters);

      // Format response for client API
      const formattedTransactions = result.data.map((transaction: any) => ({
        id: transaction.id,
        type: transaction.type.toLowerCase(),
        amount: transaction.amount,
        description: transaction.description,
        balance_after: transaction.balanceAfter,
        created_at: transaction.createdAt,
      }));

      res.status(200).json({
        success: true,
        data: formattedTransactions,
        pagination: {
          current_page: result.pagination.page,
          total_pages: result.pagination.pages,
          total_records: result.pagination.total,
          per_page: result.pagination.limit,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to retrieve transactions",
        },
      });
    }
  }

  /**
   * Get account summary
   */
  static async getAccountSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).clientApiInfo;

      // Get current balance
      const balance = await WalletService.getWalletBalance(userId);

      // Get recent transactions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentTransactions = await WalletService.getTransactionHistory(
        userId,
        {
          startDate: thirtyDaysAgo,
          limit: 100,
        }
      );

      // Calculate summary statistics
      let totalSpent = 0;
      let totalAdded = 0;
      let smsCount = 0;

      recentTransactions.data.forEach((transaction: any) => {
        if (transaction.type === "DEBIT") {
          totalSpent += transaction.amount;
          if (transaction.description.includes("SMS")) {
            smsCount++;
          }
        } else if (transaction.type === "CREDIT") {
          totalAdded += transaction.amount;
        }
      });

      res.status(200).json({
        success: true,
        data: {
          current_balance: balance,
          currency: "USD",
          last_30_days: {
            total_spent: totalSpent,
            total_added: totalAdded,
            sms_sent: smsCount,
            transactions: recentTransactions.data.length,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to retrieve account summary",
        },
      });
    }
  }

  /**
   * Check if user has sufficient balance for operation
   */
  static async checkBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).clientApiInfo;
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_AMOUNT",
            message: "Valid amount is required",
          },
        });
      }

      const currentBalance = await WalletService.getWalletBalance(userId);
      const balanceNumber = Number(currentBalance);
      const hasSufficientBalance = balanceNumber >= amount;

      res.status(200).json({
        success: true,
        data: {
          current_balance: balanceNumber,
          required_amount: amount,
          sufficient: hasSufficientBalance,
          shortfall: hasSufficientBalance ? 0 : amount - balanceNumber,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to check balance",
        },
      });
    }
  }
}
