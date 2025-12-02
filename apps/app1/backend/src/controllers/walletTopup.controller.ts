import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { prisma } from '../server';
import { ApiError } from '../utils/ApiError';

export class WalletTopupController {
  /**
   * Verify wallet topup payment and update user balance
   */
  static async verifyTopup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { reference, amount } = req.body;

      if (!userId) {
        throw ApiError.unauthorized('User not authenticated');
      }

      if (!reference || !amount) {
        throw ApiError.badRequest('Payment reference and amount are required');
      }

      // Verify payment with Paystack
      const paymentVerification = await PaymentService.verifyPayment(reference);

      if (!paymentVerification.success) {
        throw ApiError.badRequest('Payment verification failed');
      }

      const { data: paymentData } = paymentVerification;

      // Check if payment was successful
      if (paymentData.status !== 'success') {
        throw ApiError.badRequest('Payment was not successful');
      }

      // Check if amount matches
      const paidAmount = paymentData.amount / 100; // Convert from pesewas to GHS
      if (Math.abs(paidAmount - amount) > 0.01) {
        throw ApiError.badRequest('Payment amount mismatch');
      }

      // Check if this payment has already been processed
      const existingTransaction = await prisma.walletTransaction.findFirst({
        where: {
          description: {
            contains: reference,
          },
        },
      });

      if (existingTransaction) {
        throw ApiError.badRequest('Payment has already been processed');
      }

      // Update user wallet balance
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          walletBalance: {
            increment: amount,
          },
        },
      });

      // Create wallet transaction record
      const walletTransaction = await prisma.walletTransaction.create({
        data: {
          userId,
          amount,
          type: 'CREDIT',
          description: `Wallet topup via Paystack - Reference: ${reference}`,
          metadata: {
            paystack_reference: reference,
            paystack_amount: paymentData.amount,
            paystack_currency: paymentData.currency,
            payment_method: 'paystack',
            topup_type: 'wallet_balance',
          },
        },
      });

      res.status(200).json({
        success: true,
        message: 'Wallet topup successful',
        data: {
          transaction: walletTransaction,
          newBalance: updatedUser.walletBalance,
          amount: amount,
          reference: reference,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet topup history
   */
  static async getTopupHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      if (!userId) {
        throw ApiError.unauthorized('User not authenticated');
      }

      // Get wallet topup transactions
      const transactions = await prisma.walletTransaction.findMany({
        where: {
          userId,
          type: 'CREDIT',
          description: {
            contains: 'topup',
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      });

      // Get total count for pagination
      const totalCount = await prisma.walletTransaction.count({
        where: {
          userId,
          type: 'CREDIT',
          description: {
            contains: 'topup',
          },
        },
      });

      const totalPages = Math.ceil(totalCount / limit);

      res.status(200).json({
        success: true,
        message: 'Wallet topup history retrieved successfully',
        data: {
          transactions,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
