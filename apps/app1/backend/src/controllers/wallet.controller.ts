import { Request, Response, NextFunction } from "express";
import { WalletService } from "../services/wallet.service";
import { ApiError } from "../middleware/error.middleware";
import { TransactionType } from "@prisma/client";

export class WalletController {
  /**
   * Get wallet balance
   */
  static async getWalletBalance(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const result = await WalletService.getWalletBalance(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transaction history
   */
  static async getTransactionHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const { type, description, startDate, endDate, page, limit } = req.query;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      // Parse date strings to Date objects
      const parsedStartDate = startDate
        ? new Date(startDate as string)
        : undefined;
      const parsedEndDate = endDate ? new Date(endDate as string) : undefined;

      const result = await WalletService.getTransactionHistory(userId, {
        type: type as TransactionType,
        description: description as string,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Add credit to user wallet
   */
  static async adminAddCredit(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user?.id;
      const { userId, amount, description } = req.body;

      if (!adminId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      if (req.user?.role !== "ADMIN") {
        throw ApiError.forbidden("Admin access required");
      }

      // Validate request body
      if (!userId || !amount) {
        throw ApiError.badRequest("User ID and amount are required");
      }

      if (typeof amount !== "number" || amount <= 0) {
        throw ApiError.badRequest("Amount must be a positive number");
      }

      const result = await WalletService.adminAddCredit(
        adminId,
        userId,
        amount,
        description
      );

      res.status(200).json({
        success: true,
        message: "Credit added successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Deduct credit from user wallet
   */
  static async adminDeductCredit(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const adminId = req.user?.id;
      const { userId, amount, description } = req.body;

      if (!adminId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      if (req.user?.role !== "ADMIN") {
        throw ApiError.forbidden("Admin access required");
      }

      // Validate request body
      if (!userId || !amount) {
        throw ApiError.badRequest("User ID and amount are required");
      }

      if (typeof amount !== "number" || amount <= 0) {
        throw ApiError.badRequest("Amount must be a positive number");
      }

      const result = await WalletService.adminDeductCredit(
        adminId,
        userId,
        amount,
        description
      );

      res.status(200).json({
        success: true,
        message: "Credit deducted successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get user wallet balance
   */
  static async adminGetUserWalletBalance(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const adminId = req.user?.id;
      const { userId } = req.params;

      if (!adminId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      if (req.user?.role !== "ADMIN") {
        throw ApiError.forbidden("Admin access required");
      }

      const result = await WalletService.getWalletBalance(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get user transaction history
   */
  static async adminGetUserTransactionHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const adminId = req.user?.id;
      const { userId } = req.params;
      const { type, startDate, endDate, page, limit } = req.query;

      if (!adminId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      if (req.user?.role !== "ADMIN") {
        throw ApiError.forbidden("Admin access required");
      }

      // Parse date strings to Date objects
      const parsedStartDate = startDate
        ? new Date(startDate as string)
        : undefined;
      const parsedEndDate = endDate ? new Date(endDate as string) : undefined;

      const result = await WalletService.getTransactionHistory(userId, {
        type: type as TransactionType,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
