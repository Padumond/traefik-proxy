import { Request } from "express";
import { User } from "@prisma/client";

// Extend Express Request interface with user property
export interface AuthenticatedRequest extends Request {
  user?: User;
  apiKey?: string;
  clientApiInfo?: {
    userId: string;
    mappedTo: string;
    rateLimit: number;
  };
  smsCalculation?: {
    mode: "credits" | "wallet" | "wallet_fallback";
    cost: number;
    credits: number;
    smsCount: number;
    totalRecipients: number;
  };
}
