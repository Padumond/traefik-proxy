import { Request, Response, NextFunction } from "express";
import { DashboardService } from "../services/dashboard.service";
import { prisma } from "../server";
import { ApiError } from "../middleware/error.middleware";
import { SenderIdStatus, MessageStatus } from "@prisma/client";
import { ArkeselService } from "../services/arkessel.service";

export class DashboardController {
  /**
   * Get all dashboard data including stats, recent messages, and recent transactions
   */
  static async getDashboardData(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const result = await DashboardService.getDashboardData(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get only dashboard stats
   */
  static async getDashboardStats(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const result = await DashboardService.getDashboardStats(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent messages
   */
  static async getRecentMessages(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const result = await DashboardService.getRecentMessages(userId, limit);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent transactions
   */
  static async getRecentTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const result = await DashboardService.getRecentTransactions(
        userId,
        limit
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test endpoint that doesn't require authentication
   * Only for development purposes
   */
  static async getTestData(req: Request, res: Response, next: NextFunction) {
    try {
      // Get a sample user ID to test with
      const testUser = await prisma.user.findFirst({
        where: { role: "CLIENT" },
      });

      if (!testUser) {
        return res
          .status(404)
          .json({ success: false, message: "No test users found" });
      }

      const userId = testUser.id;
      const result = await DashboardService.getDashboardData(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get SMS balance from Arkessel
   */
  static async getSmsBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      // Get SMS balance from Arkessel
      const balanceResponse = await ArkeselService.getBalance();

      // Extract balance from response
      let smsCredits = 0;
      let status = "error";
      let message = "Failed to get balance";

      if (
        balanceResponse.status === "success" &&
        balanceResponse.data?.balance
      ) {
        smsCredits = balanceResponse.data.balance;
        status = "success";
        message = "Balance retrieved successfully";
      } else if (
        balanceResponse.code === "000" &&
        balanceResponse.data?.balance !== undefined
      ) {
        // Handle different response format
        smsCredits = balanceResponse.data.balance;
        status = "success";
        message = "Balance retrieved successfully";
      } else {
        message = balanceResponse.message || "Unknown error";
      }

      res.status(200).json({
        success: status === "success",
        message,
        data: {
          smsCredits,
          provider: "Arkessel",
          lastUpdated: new Date().toISOString(),
          status,
        },
      });
    } catch (error) {
      console.error("Error getting SMS balance:", error);

      // Return fallback data for development
      res.status(200).json({
        success: false,
        message: "Failed to get SMS balance from provider",
        data: {
          smsCredits: 0,
          provider: "Arkessel",
          lastUpdated: new Date().toISOString(),
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  /**
   * Get average success rate statistics
   */
  static async getAverageSuccessRate(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized("User not authenticated");
      }

      const result = await DashboardService.getAverageSuccessRate(userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
