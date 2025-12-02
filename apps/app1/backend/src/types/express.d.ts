import { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
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
  }
}

export {};
