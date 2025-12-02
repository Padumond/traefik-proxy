import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { ApiError } from "./error.middleware";
import { AuthenticatedRequest } from "../types/auth.types";

const prisma = new PrismaClient();

// Type declarations are now in ../types/express.d.ts

// Middleware to authenticate users using JWT
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for token in headers
    const authHeader = req.headers.authorization;
    const apiKey = req.headers["x-api-key"] as string;

    // If no auth token or API key is provided
    if (!authHeader && !apiKey) {
      return next(ApiError.unauthorized("Authentication required"));
    }

    // Handle API key authentication
    if (apiKey) {
      const user = await prisma.user.findUnique({
        where: { apiKey },
      });

      if (!user) {
        return next(ApiError.unauthorized("Invalid API key"));
      }

      (req as AuthenticatedRequest).user = user;
      (req as AuthenticatedRequest).apiKey = apiKey;
      return next();
    }

    // Handle JWT authentication
    if (!authHeader?.startsWith("Bearer ")) {
      return next(ApiError.unauthorized("Invalid authentication format"));
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next(ApiError.unauthorized("Authentication token is required"));
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return next(
        ApiError.internal("Server authentication configuration error")
      );
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (typeof decoded !== "object" || !decoded.id) {
      return next(ApiError.unauthorized("Invalid token"));
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return next(ApiError.unauthorized("User not found"));
    }

    // Attach user to request object
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(ApiError.unauthorized("Invalid token"));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(ApiError.unauthorized("Token expired"));
    }
    next(ApiError.internal("Authentication error"));
  }
};

// Middleware to check if user has admin role
export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if ((req as AuthenticatedRequest).user?.role !== "ADMIN") {
    return next(ApiError.forbidden("Admin access required"));
  }
  next();
};

// Middleware to check if user has sufficient wallet balance
export const checkWalletBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { amount } = req.body;

  if (!amount || isNaN(parseFloat(amount))) {
    return next(ApiError.badRequest("Valid amount is required"));
  }

  if ((req as AuthenticatedRequest).user!.walletBalance < parseFloat(amount)) {
    return next(ApiError.badRequest("Insufficient wallet balance"));
  }

  next();
};

/**
 * Check SMS balance - validates user has sufficient balance for SMS sending
 * Calculates cost based on message content and recipients
 */
export const checkSmsBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      message,
      content,
      recipients,
      recipientGroups,
      billingMode = "credits",
    } = req.body;

    // Accept either 'message' or 'content' field
    const messageText = message || content;
    if (!messageText) {
      return next(ApiError.badRequest("Message content is required"));
    }

    // Calculate SMS count based on message length
    const calculateSmsCount = (text: string): number => {
      if (!text) return 1;
      // Basic SMS calculation: 160 chars per SMS for GSM 7-bit
      // 70 chars per SMS for Unicode (contains non-GSM characters)
      const isUnicode = /[^\x00-\x7F]/.test(text);
      const maxLength = isUnicode ? 70 : 160;
      return Math.ceil(text.length / maxLength);
    };

    // Calculate total recipients
    let totalRecipients = 0;

    if (recipients && Array.isArray(recipients)) {
      totalRecipients += recipients.length;
    }

    if (recipientGroups && Array.isArray(recipientGroups)) {
      // For now, we'll skip group recipient counting in middleware
      // This should be handled in the controller where we have access to the database
      totalRecipients += recipientGroups.length * 10; // Rough estimate
    }

    if (totalRecipients === 0) {
      return next(ApiError.badRequest("At least one recipient is required"));
    }

    const smsCount = calculateSmsCount(messageText);
    const costPerSms = 0.059; // GH₵0.059 per SMS
    const totalCost = costPerSms * totalRecipients * smsCount;

    // Check balance based on billing mode
    if (billingMode === "credits") {
      // Check SMS credits first
      const requiredCredits = totalRecipients * smsCount;
      if ((req as AuthenticatedRequest).user!.smsCredits >= requiredCredits) {
        // Sufficient credits available
        (req as any).smsCalculation = {
          mode: "credits",
          cost: totalCost,
          credits: requiredCredits,
          smsCount,
          totalRecipients,
        };
        return next();
      } else if (
        (req as AuthenticatedRequest).user!.walletBalance >= totalCost
      ) {
        // Fallback to wallet
        (req as any).smsCalculation = {
          mode: "wallet_fallback",
          cost: totalCost,
          credits: requiredCredits,
          smsCount,
          totalRecipients,
        };
        return next();
      } else {
        return next(
          ApiError.badRequest(
            "Insufficient balance. Need either " +
              requiredCredits +
              " credits or GH₵" +
              totalCost.toFixed(3)
          )
        );
      }
    } else {
      // Wallet mode - check wallet balance only
      if ((req as AuthenticatedRequest).user!.walletBalance >= totalCost) {
        (req as any).smsCalculation = {
          mode: "wallet",
          cost: totalCost,
          credits: 0,
          smsCount,
          totalRecipients,
        };
        return next();
      } else {
        return next(
          ApiError.badRequest(
            "Insufficient wallet balance. Required: GH₵" + totalCost.toFixed(3)
          )
        );
      }
    }
  } catch (error) {
    return next(ApiError.internal("Error checking SMS balance"));
  }
};
