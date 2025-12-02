import { PrismaClient, TransactionType } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";

const prisma = new PrismaClient();

interface TransactionParams {
  userId: string;
  amount: number;
  type: TransactionType;
  description?: string;
}

export interface CreateTransactionRequest {
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  reference?: string;
  metadata?: any;
  externalTransactionId?: string;
}

export interface TransactionFilter {
  userId?: string;
  type?: TransactionType;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  reference?: string;
  limit?: number;
  offset?: number;
}

export interface WalletBalance {
  userId: string;
  balance: number;
  currency: string;
  lastUpdated: Date;
  pendingCredits: number;
  pendingDebits: number;
  availableBalance: number;
}

export interface TransactionSummary {
  totalCredits: number;
  totalDebits: number;
  netAmount: number;
  transactionCount: number;
  averageTransaction: number;
  largestCredit: number;
  largestDebit: number;
}

export class WalletService {
  /**
   * Create a new wallet transaction
   */
  static async createTransaction({
    userId,
    amount,
    type,
    description,
  }: TransactionParams) {
    try {
      // Validate amount
      if (amount <= 0) {
        throw ApiError.badRequest("Amount must be greater than zero");
      }

      // Get user to check balance for debit transactions
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw ApiError.notFound("User not found");
      }

      // For debit transactions, check if user has sufficient balance
      if (type === "DEBIT" && user.walletBalance < amount) {
        throw ApiError.badRequest("Insufficient wallet balance");
      }

      // Update user's wallet balance
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          walletBalance: {
            increment: type === "CREDIT" ? amount : -amount,
          },
        },
      });

      // Create transaction record
      const transaction = await prisma.walletTransaction.create({
        data: {
          userId,
          amount,
          type,
          description:
            description ||
            `${type === "CREDIT" ? "Credit" : "Debit"} transaction`,
        },
      });

      return {
        transaction,
        newBalance: updatedUser.walletBalance,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Wallet Service Error:", error);
      throw ApiError.internal("Failed to create transaction");
    }
  }

  /**
   * Get user's wallet balance
   */
  static async getWalletBalance(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          walletBalance: true,
          smsCredits: true,
        },
      });

      if (!user) {
        throw ApiError.notFound("User not found");
      }

      return {
        balance: user.walletBalance,
        smsCredits: user.smsCredits,
        user: {
          id: user.id,
          name: user.name,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Wallet Service Error:", error);
      throw ApiError.internal("Failed to get wallet balance");
    }
  }

  /**
   * Get user's transaction history
   */
  static async getTransactionHistory(
    userId: string,
    filters: {
      type?: TransactionType;
      description?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {}
  ) {
    try {
      const {
        type,
        description,
        startDate,
        endDate,
        page = 1,
        limit = 10,
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause based on filters
      const where: any = { userId };

      if (type) {
        where.type = type;
      }

      if (description) {
        // Support partial matching for description
        where.description = {
          contains: description,
          mode: "insensitive",
        };
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      // Get total count for pagination
      const totalCount = await prisma.walletTransaction.count({ where });

      // Get transactions
      const transactions = await prisma.walletTransaction.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      });

      return {
        data: transactions,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      console.error("Wallet Service Error:", error);
      throw ApiError.internal("Failed to get transaction history");
    }
  }

  /**
   * Admin function to add credit to a user's wallet
   */
  static async adminAddCredit(
    adminId: string,
    targetUserId: string,
    amount: number,
    description?: string
  ) {
    try {
      // Validate amount
      if (amount <= 0) {
        throw ApiError.badRequest("Amount must be greater than zero");
      }

      // Check if admin user exists and is actually an admin
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw ApiError.notFound("Admin user not found");
      }

      if (admin.role !== "ADMIN") {
        throw ApiError.forbidden("Only admins can perform this action");
      }

      // Check if target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        throw ApiError.notFound("Target user not found");
      }

      // Create a credit transaction
      return this.createTransaction({
        userId: targetUserId,
        amount,
        type: "CREDIT",
        description: description || `Credit added by admin ${admin.name}`,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Wallet Service Error:", error);
      throw ApiError.internal("Failed to add credit");
    }
  }

  /**
   * Admin function to deduct credit from a user's wallet
   */
  static async adminDeductCredit(
    adminId: string,
    targetUserId: string,
    amount: number,
    description?: string
  ) {
    try {
      // Validate amount
      if (amount <= 0) {
        throw ApiError.badRequest("Amount must be greater than zero");
      }

      // Check if admin user exists and is actually an admin
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw ApiError.notFound("Admin user not found");
      }

      if (admin.role !== "ADMIN") {
        throw ApiError.forbidden("Only admins can perform this action");
      }

      // Check if target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        throw ApiError.notFound("Target user not found");
      }

      // Check if target user has sufficient balance
      if (targetUser.walletBalance < amount) {
        throw ApiError.badRequest("Insufficient wallet balance");
      }

      // Create a debit transaction
      return this.createTransaction({
        userId: targetUserId,
        amount,
        type: "DEBIT",
        description: description || `Credit deducted by admin ${admin.name}`,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Wallet Service Error:", error);
      throw ApiError.internal("Failed to deduct credit");
    }
  }

  /**
   * Get enhanced wallet balance with pending amounts
   */
  static async getEnhancedBalance(userId: string): Promise<WalletBalance> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          walletBalance: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw ApiError.notFound("User not found");
      }

      // Calculate pending amounts
      const [pendingCredits, pendingDebits] = await Promise.all([
        prisma.walletTransaction.aggregate({
          where: {
            userId,
            type: "CREDIT",
            status: "PENDING",
          },
          _sum: { amount: true },
        }),
        prisma.walletTransaction.aggregate({
          where: {
            userId,
            type: "DEBIT",
            status: "PENDING",
          },
          _sum: { amount: true },
        }),
      ]);

      const pendingCreditAmount = pendingCredits._sum.amount || 0;
      const pendingDebitAmount = pendingDebits._sum.amount || 0;
      const availableBalance = user.walletBalance - pendingDebitAmount;

      return {
        userId,
        balance: user.walletBalance,
        currency: "USD",
        lastUpdated: user.updatedAt,
        pendingCredits: pendingCreditAmount,
        pendingDebits: pendingDebitAmount,
        availableBalance: Math.max(0, availableBalance),
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Error getting enhanced balance:", error);
      throw ApiError.internal("Failed to get wallet balance");
    }
  }

  /**
   * Create enhanced transaction with status tracking
   */
  static async createEnhancedTransaction(
    data: CreateTransactionRequest
  ): Promise<any> {
    try {
      const {
        userId,
        type,
        amount,
        description,
        reference,
        metadata,
        externalTransactionId,
      } = data;

      if (amount <= 0) {
        throw ApiError.badRequest("Transaction amount must be positive");
      }

      // For debit transactions, check available balance
      if (type === "DEBIT") {
        const balance = await this.getEnhancedBalance(userId);
        if (balance.availableBalance < amount) {
          throw ApiError.badRequest(
            "Insufficient balance for this transaction"
          );
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        const transaction = await tx.walletTransaction.create({
          data: {
            userId,
            type,
            amount,
            description,
            reference,
            metadata,
            externalTransactionId,
            status: "PENDING",
          },
        });

        // For credits, apply immediately and mark complete
        if (type === "CREDIT") {
          await tx.user.update({
            where: { id: userId },
            data: { walletBalance: { increment: amount } },
          });

          await tx.walletTransaction.update({
            where: { id: transaction.id },
            data: { status: "COMPLETED" },
          });
        }

        return transaction;
      });

      return result;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Error creating enhanced transaction:", error);
      throw ApiError.internal("Failed to create transaction");
    }
  }

  /**
   * Complete a pending transaction
   */
  static async completeTransaction(transactionId: string): Promise<any> {
    try {
      const transaction = await prisma.walletTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw ApiError.notFound("Transaction not found");
      }

      if (transaction.status !== "PENDING") {
        throw ApiError.badRequest("Transaction is not pending");
      }

      const result = await prisma.$transaction(async (tx) => {
        const updatedTransaction = await tx.walletTransaction.update({
          where: { id: transactionId },
          data: { status: "COMPLETED" },
        });

        if (transaction.type === "DEBIT") {
          await tx.user.update({
            where: { id: transaction.userId },
            data: { walletBalance: { decrement: transaction.amount } },
          });
        }

        return updatedTransaction;
      });

      return result;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Error completing transaction:", error);
      throw ApiError.internal("Failed to complete transaction");
    }
  }

  /**
   * Cancel a pending transaction
   */
  static async cancelTransaction(
    transactionId: string,
    reason?: string
  ): Promise<any> {
    try {
      const transaction = await prisma.walletTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw ApiError.notFound("Transaction not found");
      }

      if (transaction.status !== "PENDING") {
        throw ApiError.badRequest("Transaction is not pending");
      }

      const result = await prisma.$transaction(async (tx) => {
        const updatedTransaction = await tx.walletTransaction.update({
          where: { id: transactionId },
          data: {
            status: "CANCELLED",
            metadata: {
              ...((transaction.metadata as any) || {}),
              cancellationReason: reason,
              cancelledAt: new Date(),
            },
          },
        });

        // Reverse credit transactions that were already applied
        if (transaction.type === "CREDIT") {
          await tx.user.update({
            where: { id: transaction.userId },
            data: { walletBalance: { decrement: transaction.amount } },
          });
        }

        return updatedTransaction;
      });

      return result;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Error cancelling transaction:", error);
      throw ApiError.internal("Failed to cancel transaction");
    }
  }
}
