import { Request, Response, NextFunction } from "express";
import { PricingService } from "../services/pricing.service";
import { ApiError } from "../middleware/error.middleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class BalanceResellingController {
  /**
   * Sync Arkessel balance
   */
  static async syncArkeselBalance(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;

      const balance = await PricingService.syncArkeselBalance(userId);

      res.status(200).json({
        success: true,
        message: "Arkessel balance synced successfully",
        data: {
          balance,
          syncedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to sync Arkessel balance",
        error: error.message,
      });
    }
  }

  /**
   * Distribute balance from Arkessel to client
   */
  static async distributeBalance(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { arkeselCredits, distributionType = "MANUAL" } = req.body;

      if (!arkeselCredits || arkeselCredits <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid Arkessel credits amount is required",
        });
      }

      const result = await PricingService.distributeBalance({
        userId,
        arkeselCredits,
        distributionType,
      });

      res.status(200).json({
        success: true,
        message: "Balance distributed successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to distribute balance",
        error: error.message,
      });
    }
  }

  /**
   * Auto-distribute balance
   */
  static async autoDistributeBalance(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;

      const result = await PricingService.autoDistributeBalance(userId);

      res.status(200).json({
        success: true,
        message: "Auto-distribution completed",
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to auto-distribute balance",
        error: error.message,
      });
    }
  }

  /**
   * Create pricing tier
   */
  static async createPricingTier(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { name, minVolume, maxVolume, discountPercentage, isActive } =
        req.body;

      if (!name || !minVolume || discountPercentage === undefined) {
        return res.status(400).json({
          success: false,
          message: "Name, minimum volume, and discount percentage are required",
        });
      }

      const tier = await PricingService.createPricingTier({
        userId,
        name,
        minVolume,
        maxVolume,
        discountPercentage,
        isActive,
      });

      res.status(201).json({
        success: true,
        message: "Pricing tier created successfully",
        data: tier,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to create pricing tier",
        error: error.message,
      });
    }
  }

  /**
   * Get pricing tiers
   */
  static async getPricingTiers(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;

      const tiers = await PricingService.getPricingTiers(userId);

      res.status(200).json({
        success: true,
        message: "Pricing tiers retrieved successfully",
        data: tiers,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get pricing tiers",
        error: error.message,
      });
    }
  }

  /**
   * Calculate bulk pricing
   */
  static async calculateBulkPricing(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { volumes, countryCode, smsType } = req.body;

      if (!volumes || !Array.isArray(volumes) || volumes.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Valid volumes array is required",
        });
      }

      const result = await PricingService.calculateBulkPricing({
        userId,
        volumes,
        countryCode,
        smsType,
      });

      res.status(200).json({
        success: true,
        message: "Bulk pricing calculated successfully",
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to calculate bulk pricing",
        error: error.message,
      });
    }
  }

  /**
   * Get pricing recommendations
   */
  static async getPricingRecommendations(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;

      const recommendations = await PricingService.getPricingRecommendations(
        userId
      );

      res.status(200).json({
        success: true,
        message: "Pricing recommendations retrieved successfully",
        data: recommendations,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get pricing recommendations",
        error: error.message,
      });
    }
  }

  /**
   * Get balance distribution history
   */
  static async getDistributionHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).user;
      const { page = 1, limit = 10, startDate, endDate } = req.query;

      // For now, we'll get wallet transactions related to balance distribution
      const transactions = await prisma.walletTransaction.findMany({
        where: {
          userId,
          type: "CREDIT",
          description: {
            contains: "Balance distribution",
          },
          ...(startDate &&
            endDate && {
              createdAt: {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string),
              },
            }),
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      });

      const total = await prisma.walletTransaction.count({
        where: {
          userId,
          type: "CREDIT",
          description: {
            contains: "Balance distribution",
          },
          ...(startDate &&
            endDate && {
              createdAt: {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string),
              },
            }),
        },
      });

      res.status(200).json({
        success: true,
        message: "Distribution history retrieved successfully",
        data: {
          transactions,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            pages: Math.ceil(total / parseInt(limit as string)),
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get distribution history",
        error: error.message,
      });
    }
  }
}
