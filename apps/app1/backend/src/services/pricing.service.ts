import { PrismaClient, MarkupType } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";

const prisma = new PrismaClient();

interface PricingCalculationParams {
  userId: string;
  volume: number;
  countryCode?: string;
  smsType?: string;
  baseCost?: number;
}

interface PricingResult {
  baseCost: number;
  markup: number;
  markupType: MarkupType;
  clientPrice: number;
  profit: number;
  markupRule?: any;
}

interface CreateMarkupRuleParams {
  userId: string;
  name: string;
  markupType: MarkupType;
  markupValue: number;
  minVolume?: number;
  maxVolume?: number;
  countryCode?: string;
  smsType?: string;
  priority?: number;
}

export class PricingService {
  /**
   * Get Arkessel balance and sync with system
   */
  static async syncArkeselBalance(userId: string) {
    try {
      // This would integrate with Arkessel API to get current balance
      // For now, we'll simulate the balance check
      const arkeselBalance = await this.getArkeselBalance();

      // TODO: Update system records with current Arkessel balance
      // Note: arkeselBalance table needs to be added to Prisma schema
      /*
      await prisma.arkeselBalance.upsert({
        where: { userId },
        update: {
          balance: arkeselBalance,
          lastSyncAt: new Date(),
        },
        create: {
          userId,
          balance: arkeselBalance,
          lastSyncAt: new Date(),
        },
      });
      */

      return arkeselBalance;
    } catch (error) {
      console.error("Arkessel balance sync error:", error);
      throw ApiError.internal("Failed to sync Arkessel balance");
    }
  }

  /**
   * Distribute balance from Arkessel to client based on pricing tiers
   */
  static async distributeBalance(params: {
    userId: string;
    arkeselCredits: number;
    distributionType?: "AUTOMATIC" | "MANUAL";
  }) {
    try {
      const { userId, arkeselCredits, distributionType = "AUTOMATIC" } = params;

      // Get user's pricing configuration
      const pricingConfig = await this.getUserPricingConfig(userId);

      // Calculate client credits based on markup
      const clientCredits = this.calculateClientCredits(
        arkeselCredits,
        pricingConfig
      );

      // Create wallet transaction for the client
      const transaction = await prisma.walletTransaction.create({
        data: {
          userId,
          type: "CREDIT",
          amount: clientCredits,
          description: `Balance distribution from Arkessel: ${arkeselCredits} credits converted to ${clientCredits} client credits`,
          metadata: {
            arkeselCredits,
            distributionType,
            conversionRate: clientCredits / arkeselCredits,
          },
        },
      });

      // Update user wallet balance
      await prisma.user.update({
        where: { id: userId },
        data: {
          walletBalance: {
            increment: clientCredits,
          },
        },
      });

      // Log the distribution for analytics
      await this.logBalanceDistribution({
        userId,
        arkeselCredits,
        clientCredits,
        distributionType,
        transactionId: transaction.id,
      });

      return {
        success: true,
        arkeselCredits,
        clientCredits,
        conversionRate: clientCredits / arkeselCredits,
        transaction,
      };
    } catch (error) {
      console.error("Balance distribution error:", error);
      throw ApiError.internal("Failed to distribute balance");
    }
  }

  /**
   * Calculate pricing for SMS with markup rules
   */
  static async calculatePricing(
    params: PricingCalculationParams
  ): Promise<PricingResult> {
    try {
      const { userId, volume, countryCode, smsType, baseCost = 0.01 } = params;

      // Get applicable markup rules for this user
      const markupRules = await prisma.markupRule.findMany({
        where: {
          userId,
          isActive: true,
          AND: [
            {
              OR: [{ minVolume: { lte: volume } }, { minVolume: 0 }],
            },
            {
              OR: [{ maxVolume: { gte: volume } }, { maxVolume: null }],
            },
            {
              OR: [{ countryCode: countryCode }, { countryCode: null }],
            },
            {
              OR: [{ smsType: smsType }, { smsType: null }],
            },
          ],
        },
        orderBy: {
          priority: "desc",
        },
      });

      // Use the highest priority rule, or default markup
      const applicableRule = markupRules[0];
      let markup = 0;
      let markupType: MarkupType = "PERCENTAGE";

      if (applicableRule) {
        markup = applicableRule.markupValue;
        markupType = applicableRule.markupType;
      } else {
        // Default markup if no rules found
        markup = await this.getDefaultMarkup(userId);
        markupType = "PERCENTAGE";
      }

      // Calculate client price based on markup type
      let clientPrice = baseCost;

      switch (markupType) {
        case "PERCENTAGE":
          clientPrice = baseCost * (1 + markup / 100);
          break;
        case "FIXED_AMOUNT":
          clientPrice = baseCost + markup;
          break;
        case "TIERED":
          // For tiered pricing, markup value represents the tier multiplier
          clientPrice = baseCost * markup;
          break;
      }

      const profit = clientPrice - baseCost;

      return {
        baseCost,
        markup,
        markupType,
        clientPrice: Math.round(clientPrice * 10000) / 10000, // Round to 4 decimal places
        profit: Math.round(profit * 10000) / 10000,
        markupRule: applicableRule,
      };
    } catch (error) {
      console.error("Pricing Calculation Error:", error);
      throw ApiError.internal("Failed to calculate pricing");
    }
  }

  /**
   * Create markup rule
   */
  static async createMarkupRule(params: CreateMarkupRuleParams) {
    try {
      const {
        userId,
        name,
        markupType,
        markupValue,
        minVolume = 0,
        maxVolume,
        countryCode,
        smsType,
        priority = 0,
      } = params;

      // Validate markup value
      if (markupValue < 0) {
        throw ApiError.badRequest("Markup value cannot be negative");
      }

      if (markupType === "PERCENTAGE" && markupValue > 1000) {
        throw ApiError.badRequest("Percentage markup cannot exceed 1000%");
      }

      // Check for duplicate rule names
      const existingRule = await prisma.markupRule.findFirst({
        where: {
          userId,
          name,
        },
      });

      if (existingRule) {
        throw ApiError.conflict("Markup rule with this name already exists");
      }

      const markupRule = await prisma.markupRule.create({
        data: {
          userId,
          name,
          markupType,
          markupValue,
          minVolume,
          maxVolume,
          countryCode,
          smsType,
          priority,
        },
      });

      return markupRule;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Markup Rule Creation Error:", error);
      throw ApiError.internal("Failed to create markup rule");
    }
  }

  /**
   * Get markup rules for user
   */
  static async getMarkupRules(userId: string, includeInactive = false) {
    try {
      const where: any = { userId };
      if (!includeInactive) {
        where.isActive = true;
      }

      const rules = await prisma.markupRule.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });

      return rules;
    } catch (error) {
      console.error("Get Markup Rules Error:", error);
      throw ApiError.internal("Failed to get markup rules");
    }
  }

  /**
   * Update markup rule
   */
  static async updateMarkupRule(
    ruleId: string,
    userId: string,
    updates: Partial<CreateMarkupRuleParams>
  ) {
    try {
      const existingRule = await prisma.markupRule.findFirst({
        where: {
          id: ruleId,
          userId,
        },
      });

      if (!existingRule) {
        throw ApiError.notFound("Markup rule not found");
      }

      // Validate markup value if provided
      if (updates.markupValue !== undefined) {
        if (updates.markupValue < 0) {
          throw ApiError.badRequest("Markup value cannot be negative");
        }

        const markupType = updates.markupType || existingRule.markupType;
        if (markupType === "PERCENTAGE" && updates.markupValue > 1000) {
          throw ApiError.badRequest("Percentage markup cannot exceed 1000%");
        }
      }

      // Check for duplicate names if name is being updated
      if (updates.name && updates.name !== existingRule.name) {
        const duplicateName = await prisma.markupRule.findFirst({
          where: {
            userId,
            name: updates.name,
            id: { not: ruleId },
          },
        });

        if (duplicateName) {
          throw ApiError.conflict("Markup rule with this name already exists");
        }
      }

      const updatedRule = await prisma.markupRule.update({
        where: { id: ruleId },
        data: updates,
      });

      return updatedRule;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Update Markup Rule Error:", error);
      throw ApiError.internal("Failed to update markup rule");
    }
  }

  /**
   * Delete markup rule
   */
  static async deleteMarkupRule(ruleId: string, userId: string) {
    try {
      const rule = await prisma.markupRule.findFirst({
        where: {
          id: ruleId,
          userId,
        },
      });

      if (!rule) {
        throw ApiError.notFound("Markup rule not found");
      }

      await prisma.markupRule.delete({
        where: { id: ruleId },
      });

      return { success: true, message: "Markup rule deleted successfully" };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Delete Markup Rule Error:", error);
      throw ApiError.internal("Failed to delete markup rule");
    }
  }

  /**
   * Record profit transaction
   */
  static async recordProfitTransaction(params: {
    userId: string;
    transactionId: string;
    transactionType: string;
    baseCost: number;
    clientCharge: number;
    markupApplied: number;
    volume: number;
    countryCode?: string;
  }) {
    try {
      const profit = params.clientCharge - params.baseCost;

      const profitTransaction = await prisma.profitTransaction.create({
        data: {
          userId: params.userId,
          transactionId: params.transactionId,
          transactionType: params.transactionType,
          baseCost: params.baseCost,
          clientCharge: params.clientCharge,
          profit,
          markupApplied: params.markupApplied,
          volume: params.volume,
          countryCode: params.countryCode,
        },
      });

      return profitTransaction;
    } catch (error) {
      console.error("Record Profit Transaction Error:", error);
      throw ApiError.internal("Failed to record profit transaction");
    }
  }

  /**
   * Get profit analytics
   */
  static async getProfitAnalytics(userId: string, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [totalProfit, totalTransactions, profitByType, recentTransactions] =
        await Promise.all([
          prisma.profitTransaction.aggregate({
            where: {
              userId,
              createdAt: { gte: startDate },
            },
            _sum: { profit: true },
          }),
          prisma.profitTransaction.count({
            where: {
              userId,
              createdAt: { gte: startDate },
            },
          }),
          prisma.profitTransaction.groupBy({
            by: ["transactionType"],
            where: {
              userId,
              createdAt: { gte: startDate },
            },
            _sum: { profit: true },
            _count: { id: true },
          }),
          prisma.profitTransaction.findMany({
            where: {
              userId,
              createdAt: { gte: startDate },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          }),
        ]);

      return {
        period: `${days} days`,
        totalProfit: totalProfit._sum.profit || 0,
        totalTransactions,
        profitByType: profitByType.map((item) => ({
          type: item.transactionType,
          profit: item._sum.profit || 0,
          count: item._count.id,
        })),
        recentTransactions,
      };
    } catch (error) {
      console.error("Profit Analytics Error:", error);
      throw ApiError.internal("Failed to get profit analytics");
    }
  }

  /**
   * Get default markup for user (fallback)
   */
  private static async getDefaultMarkup(userId: string): Promise<number> {
    try {
      // Check if user has a pricing tier configuration
      const userPricingTier = await prisma.userPricingTier.findFirst({
        where: {
          userId,
          isActive: true,
        },
        include: {
          pricingTier: true,
        },
      });

      if (userPricingTier?.customPricing) {
        const customPricing = userPricingTier.customPricing as any;
        return customPricing.defaultMarkup || 20; // 20% default
      }

      // Default markup based on pricing tier
      const tierMarkups = {
        BASIC: 15,
        STANDARD: 20,
        PREMIUM: 25,
        ENTERPRISE: 30,
        CUSTOM: 20,
      };

      const tier = userPricingTier?.pricingTier?.tier || "BASIC";
      return tierMarkups[tier] || 20;
    } catch (error) {
      console.error("Get Default Markup Error:", error);
      return 20; // Fallback to 20%
    }
  }

  /**
   * Get Arkessel balance (placeholder for actual API integration)
   */
  private static async getArkeselBalance(): Promise<number> {
    // TODO: Integrate with actual Arkessel API
    // For now, return a simulated balance
    return 1000; // 1000 credits
  }

  /**
   * Get user's pricing configuration
   */
  private static async getUserPricingConfig(userId: string) {
    const markupRules = await prisma.markupRule.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        priority: "desc",
      },
    });

    const defaultMarkup = await this.getDefaultMarkup(userId);

    return {
      markupRules,
      defaultMarkup,
    };
  }

  /**
   * Calculate client credits from Arkessel credits based on pricing config
   */
  private static calculateClientCredits(
    arkeselCredits: number,
    pricingConfig: any
  ): number {
    // Use the highest priority markup rule or default
    const rule = pricingConfig.markupRules[0];

    if (rule) {
      switch (rule.markupType) {
        case "PERCENTAGE":
          return arkeselCredits * (1 - rule.markupValue / 100);
        case "FIXED_AMOUNT":
          return Math.max(0, arkeselCredits - rule.markupValue);
        case "TIERED":
          return arkeselCredits / rule.markupValue;
        default:
          return arkeselCredits * (1 - pricingConfig.defaultMarkup / 100);
      }
    }

    // Use default markup
    return arkeselCredits * (1 - pricingConfig.defaultMarkup / 100);
  }

  /**
   * Log balance distribution for analytics
   */
  private static async logBalanceDistribution(params: {
    userId: string;
    arkeselCredits: number;
    clientCredits: number;
    distributionType: string;
    transactionId: string;
  }) {
    try {
      // For now, we'll log to console since we need to add the table to schema
      console.log("Balance Distribution Log:", params);

      // TODO: Implement actual database logging when schema is updated
      // await prisma.balanceDistributionLog.create({
      //   data: {
      //     userId: params.userId,
      //     arkeselCredits: params.arkeselCredits,
      //     clientCredits: params.clientCredits,
      //     distributionType: params.distributionType,
      //     transactionId: params.transactionId,
      //     conversionRate: params.clientCredits / params.arkeselCredits,
      //   },
      // });
    } catch (error) {
      console.error("Failed to log balance distribution:", error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Create pricing tier for volume-based discounts
   */
  static async createPricingTier(params: {
    userId: string;
    name: string;
    minVolume: number;
    maxVolume?: number;
    discountPercentage: number;
    isActive?: boolean;
  }) {
    try {
      const {
        userId,
        name,
        minVolume,
        maxVolume,
        discountPercentage,
        isActive = true,
      } = params;

      // For now, we'll use markup rules to simulate pricing tiers
      const pricingTier = await prisma.markupRule.create({
        data: {
          userId,
          name: `Tier: ${name}`,
          markupType: "PERCENTAGE",
          markupValue: discountPercentage,
          minVolume,
          maxVolume,
          isActive,
          priority: 1,
        },
      });

      return pricingTier;
    } catch (error) {
      console.error("Failed to create pricing tier:", error);
      throw ApiError.internal("Failed to create pricing tier");
    }
  }

  /**
   * Get pricing tiers for user
   */
  static async getPricingTiers(userId: string) {
    try {
      const tiers = await prisma.markupRule.findMany({
        where: {
          userId,
          isActive: true,
          name: {
            startsWith: "Tier:",
          },
        },
        orderBy: {
          minVolume: "asc",
        },
      });

      return tiers;
    } catch (error) {
      console.error("Failed to get pricing tiers:", error);
      throw ApiError.internal("Failed to get pricing tiers");
    }
  }

  /**
   * Auto-distribute balance based on user preferences
   */
  static async autoDistributeBalance(userId: string) {
    try {
      // Check if user has auto-distribution enabled
      const billingConfig = await prisma.billingConfig.findUnique({
        where: { userId },
      });

      if (!billingConfig?.autoRecharge) {
        return { success: false, message: "Auto-distribution not enabled" };
      }

      // Get current Arkessel balance
      const arkeselBalance = await this.syncArkeselBalance(userId);

      // Check if balance is above threshold
      if (arkeselBalance < billingConfig.autoRechargeThreshold) {
        return { success: false, message: "Balance below threshold" };
      }

      // Distribute the balance
      const result = await this.distributeBalance({
        userId,
        arkeselCredits: billingConfig.autoRechargeAmount,
        distributionType: "AUTOMATIC",
      });

      return result;
    } catch (error) {
      console.error("Auto-distribution error:", error);
      throw ApiError.internal("Failed to auto-distribute balance");
    }
  }

  /**
   * Calculate bulk pricing with volume discounts
   */
  static async calculateBulkPricing(params: {
    userId: string;
    volumes: number[];
    countryCode?: string;
    smsType?: string;
  }) {
    try {
      const { userId, volumes, countryCode, smsType } = params;
      const results = [];

      for (const volume of volumes) {
        const pricing = await this.calculatePricing({
          userId,
          volume,
          countryCode,
          smsType,
        });
        results.push({
          volume,
          ...pricing,
        });
      }

      return {
        bulkPricing: results,
        totalVolume: volumes.reduce((sum, vol) => sum + vol, 0),
        averagePrice:
          results.reduce((sum, result) => sum + result.clientPrice, 0) /
          results.length,
      };
    } catch (error) {
      console.error("Bulk pricing calculation error:", error);
      throw ApiError.internal("Failed to calculate bulk pricing");
    }
  }

  /**
   * Get pricing recommendations based on usage patterns
   */
  static async getPricingRecommendations(userId: string) {
    try {
      // Get user's SMS usage patterns
      const usageStats = await this.getUserUsageStats(userId);
      const currentMarkup = await this.getDefaultMarkup(userId);

      const recommendations = [];

      // Volume-based recommendations
      if (usageStats.averageMonthlyVolume > 10000) {
        recommendations.push({
          type: "VOLUME_DISCOUNT",
          title: "High Volume Discount",
          description:
            "Consider offering volume discounts for high-usage clients",
          suggestedMarkup: Math.max(currentMarkup - 5, 10),
          potentialSavings: usageStats.averageMonthlyVolume * 0.001,
        });
      }

      // Country-specific recommendations
      if (usageStats.topCountries.length > 0) {
        recommendations.push({
          type: "COUNTRY_SPECIFIC",
          title: "Country-Specific Pricing",
          description: `Optimize pricing for top countries: ${usageStats.topCountries.join(
            ", "
          )}`,
          suggestedAction: "Create country-specific markup rules",
        });
      }

      return {
        recommendations,
        currentMarkup,
        usageStats,
      };
    } catch (error) {
      console.error("Pricing recommendations error:", error);
      throw ApiError.internal("Failed to get pricing recommendations");
    }
  }

  /**
   * Get user usage statistics for pricing optimization
   */
  private static async getUserUsageStats(userId: string) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const smsLogs = await prisma.smsLog.findMany({
        where: {
          userId,
          sentAt: {
            gte: thirtyDaysAgo,
          },
        },
        select: {
          recipients: true,
          cost: true,
          sentAt: true,
        },
      });

      const totalVolume = smsLogs.reduce(
        (sum, log) => sum + log.recipients.length,
        0
      );
      const totalCost = smsLogs.reduce((sum, log) => sum + (log.cost || 0), 0);
      const averageMonthlyVolume = totalVolume;

      // Extract country codes from phone numbers (simplified)
      const countries = new Map();
      smsLogs.forEach((log) => {
        log.recipients.forEach((recipient) => {
          const countryCode = recipient.substring(0, 3); // Simplified country code extraction
          countries.set(countryCode, (countries.get(countryCode) || 0) + 1);
        });
      });

      const topCountries = Array.from(countries.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([code]) => code);

      return {
        totalVolume,
        totalCost,
        averageMonthlyVolume,
        topCountries,
        averageCostPerSms: totalVolume > 0 ? totalCost / totalVolume : 0,
      };
    } catch (error) {
      console.error("Usage stats error:", error);
      return {
        totalVolume: 0,
        totalCost: 0,
        averageMonthlyVolume: 0,
        topCountries: [],
        averageCostPerSms: 0,
      };
    }
  }
}
