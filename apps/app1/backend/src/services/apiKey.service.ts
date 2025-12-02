import { PrismaClient } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";
import crypto from "crypto";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export interface CreateApiKeyRequest {
  userId: string;
  name: string;
  permissions?: string[];
  ipWhitelist?: string[];
  rateLimit?: number;
  expiresAt?: Date;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  prefix: string;
  suffix: string;
  permissions: string[];
  ipWhitelist: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: Date | null;
  lastUsedIp: string | null;
  usageCount: number;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyWithSecret extends ApiKeyResponse {
  apiKey: string; // Only returned when creating a new key
}

export class ApiKeyService {
  /**
   * Generate a secure API key
   */
  private static generateApiKey(): string {
    const randomBytes = crypto.randomBytes(32);
    return `msk_${randomBytes.toString("hex")}`;
  }

  /**
   * Hash an API key for secure storage
   */
  private static async hashApiKey(apiKey: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(apiKey, saltRounds);
  }

  /**
   * Verify an API key against its hash
   */
  private static async verifyApiKey(
    apiKey: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(apiKey, hash);
  }

  /**
   * Extract prefix and suffix from API key for display
   */
  private static extractDisplayParts(apiKey: string): {
    prefix: string;
    suffix: string;
  } {
    const prefix = apiKey.substring(0, 8); // "msk_xxxx"
    const suffix = apiKey.slice(-6); // Last 6 characters
    return { prefix, suffix };
  }

  /**
   * Create a new API key
   */
  static async createApiKey(
    data: CreateApiKeyRequest
  ): Promise<ApiKeyWithSecret> {
    try {
      // Verify user exists and is a client
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (!user) {
        throw ApiError.notFound("User not found");
      }

      if (user.role !== "CLIENT") {
        throw ApiError.badRequest("Only client users can have API keys");
      }

      // Check if user has reached API key limit (e.g., 10 keys max)
      const existingKeysCount = await prisma.apiKey.count({
        where: { userId: data.userId, isActive: true },
      });

      if (existingKeysCount >= 10) {
        throw ApiError.badRequest("Maximum number of API keys reached (10)");
      }

      // Generate API key
      const apiKey = this.generateApiKey();
      const keyHash = await this.hashApiKey(apiKey);
      const { prefix, suffix } = this.extractDisplayParts(apiKey);

      // Create API key record
      const newApiKey = await prisma.apiKey.create({
        data: {
          name: data.name,
          keyHash,
          prefix,
          suffix,
          userId: data.userId,
          permissions: data.permissions || [
            "sms:send",
            "sms:balance",
            "sms:status",
          ],
          ipWhitelist: data.ipWhitelist || [],
          rateLimit: data.rateLimit || 1000,
          expiresAt: data.expiresAt,
        },
      });

      return {
        id: newApiKey.id,
        name: newApiKey.name,
        prefix: newApiKey.prefix,
        suffix: newApiKey.suffix,
        permissions: newApiKey.permissions as string[],
        ipWhitelist: newApiKey.ipWhitelist,
        rateLimit: newApiKey.rateLimit,
        isActive: newApiKey.isActive,
        lastUsedAt: newApiKey.lastUsedAt,
        lastUsedIp: newApiKey.lastUsedIp,
        usageCount: newApiKey.usageCount,
        expiresAt: newApiKey.expiresAt,
        createdAt: newApiKey.createdAt,
        updatedAt: newApiKey.updatedAt,
        apiKey, // Only returned when creating
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("API Key Service Error:", error);
      throw ApiError.internal("Failed to create API key");
    }
  }

  /**
   * Get all API keys for a user
   */
  static async getUserApiKeys(userId: string): Promise<ApiKeyResponse[]> {
    try {
      const apiKeys = await prisma.apiKey.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      return apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        suffix: key.suffix,
        permissions: key.permissions as string[],
        ipWhitelist: key.ipWhitelist,
        rateLimit: key.rateLimit,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt,
        lastUsedIp: key.lastUsedIp,
        usageCount: key.usageCount,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
      }));
    } catch (error) {
      console.error("API Key Service Error:", error);
      throw ApiError.internal("Failed to retrieve API keys");
    }
  }

  /**
   * Get API key by ID
   */
  static async getApiKeyById(
    id: string,
    userId: string
  ): Promise<ApiKeyResponse> {
    try {
      const apiKey = await prisma.apiKey.findFirst({
        where: { id, userId },
      });

      if (!apiKey) {
        throw ApiError.notFound("API key not found");
      }

      return {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        suffix: apiKey.suffix,
        permissions: apiKey.permissions as string[],
        ipWhitelist: apiKey.ipWhitelist,
        rateLimit: apiKey.rateLimit,
        isActive: apiKey.isActive,
        lastUsedAt: apiKey.lastUsedAt,
        lastUsedIp: apiKey.lastUsedIp,
        usageCount: apiKey.usageCount,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("API Key Service Error:", error);
      throw ApiError.internal("Failed to retrieve API key");
    }
  }

  /**
   * Update API key
   */
  static async updateApiKey(
    id: string,
    userId: string,
    updates: {
      name?: string;
      permissions?: string[];
      ipWhitelist?: string[];
      rateLimit?: number;
      isActive?: boolean;
      expiresAt?: Date | null;
    }
  ): Promise<ApiKeyResponse> {
    try {
      const existingKey = await prisma.apiKey.findFirst({
        where: { id, userId },
      });

      if (!existingKey) {
        throw ApiError.notFound("API key not found");
      }

      const updatedKey = await prisma.apiKey.update({
        where: { id },
        data: updates,
      });

      return {
        id: updatedKey.id,
        name: updatedKey.name,
        prefix: updatedKey.prefix,
        suffix: updatedKey.suffix,
        permissions: updatedKey.permissions as string[],
        ipWhitelist: updatedKey.ipWhitelist,
        rateLimit: updatedKey.rateLimit,
        isActive: updatedKey.isActive,
        lastUsedAt: updatedKey.lastUsedAt,
        lastUsedIp: updatedKey.lastUsedIp,
        usageCount: updatedKey.usageCount,
        expiresAt: updatedKey.expiresAt,
        createdAt: updatedKey.createdAt,
        updatedAt: updatedKey.updatedAt,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("API Key Service Error:", error);
      throw ApiError.internal("Failed to update API key");
    }
  }

  /**
   * Delete API key
   */
  static async deleteApiKey(id: string, userId: string): Promise<void> {
    try {
      const existingKey = await prisma.apiKey.findFirst({
        where: { id, userId },
      });

      if (!existingKey) {
        throw ApiError.notFound("API key not found");
      }

      await prisma.apiKey.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("API Key Service Error:", error);
      throw ApiError.internal("Failed to delete API key");
    }
  }

  /**
   * Regenerate API key (creates new key, deactivates old one)
   */
  static async regenerateApiKey(
    id: string,
    userId: string
  ): Promise<ApiKeyWithSecret> {
    try {
      const existingKey = await prisma.apiKey.findFirst({
        where: { id, userId },
      });

      if (!existingKey) {
        throw ApiError.notFound("API key not found");
      }

      // Generate new API key
      const apiKey = this.generateApiKey();
      const keyHash = await this.hashApiKey(apiKey);
      const { prefix, suffix } = this.extractDisplayParts(apiKey);

      // Update existing key with new values
      const updatedKey = await prisma.apiKey.update({
        where: { id },
        data: {
          keyHash,
          prefix,
          suffix,
          lastUsedAt: null,
          lastUsedIp: null,
          usageCount: 0,
          updatedAt: new Date(),
        },
      });

      return {
        id: updatedKey.id,
        name: updatedKey.name,
        prefix: updatedKey.prefix,
        suffix: updatedKey.suffix,
        permissions: updatedKey.permissions as string[],
        ipWhitelist: updatedKey.ipWhitelist,
        rateLimit: updatedKey.rateLimit,
        isActive: updatedKey.isActive,
        lastUsedAt: updatedKey.lastUsedAt,
        lastUsedIp: updatedKey.lastUsedIp,
        usageCount: updatedKey.usageCount,
        expiresAt: updatedKey.expiresAt,
        createdAt: updatedKey.createdAt,
        updatedAt: updatedKey.updatedAt,
        apiKey, // Return the new key
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("API Key Service Error:", error);
      throw ApiError.internal("Failed to regenerate API key");
    }
  }

  /**
   * Authenticate API key and return user info
   */
  static async authenticateApiKey(
    apiKey: string,
    ipAddress?: string
  ): Promise<{
    userId: string;
    apiKeyId: string;
    permissions: string[];
    rateLimit: number;
  }> {
    try {
      // Find all active API keys and check against each hash
      const activeKeys = await prisma.apiKey.findMany({
        where: {
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: {
          user: true,
        },
      });

      let matchedKey = null;
      for (const key of activeKeys) {
        if (await this.verifyApiKey(apiKey, key.keyHash)) {
          matchedKey = key;
          break;
        }
      }

      if (!matchedKey) {
        throw ApiError.unauthorized("Invalid API key");
      }

      // Check IP whitelist if configured
      if (matchedKey.ipWhitelist.length > 0 && ipAddress) {
        if (!matchedKey.ipWhitelist.includes(ipAddress)) {
          throw ApiError.forbidden("IP address not whitelisted");
        }
      }

      // Check if user is active
      if (!matchedKey.user || matchedKey.user.role !== "CLIENT") {
        throw ApiError.unauthorized("Invalid user account");
      }

      // Update last used information
      await prisma.apiKey.update({
        where: { id: matchedKey.id },
        data: {
          lastUsedAt: new Date(),
          lastUsedIp: ipAddress,
          usageCount: { increment: 1 },
        },
      });

      return {
        userId: matchedKey.userId,
        apiKeyId: matchedKey.id,
        permissions: matchedKey.permissions as string[],
        rateLimit: matchedKey.rateLimit,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("API Key Authentication Error:", error);
      throw ApiError.unauthorized("Authentication failed");
    }
  }

  /**
   * Log API key usage
   */
  static async logApiKeyUsage(
    apiKeyId: string,
    endpoint: string,
    method: string,
    ipAddress: string,
    statusCode: number,
    responseTime: number,
    userAgent?: string,
    requestId?: string
  ): Promise<void> {
    try {
      await prisma.apiKeyUsageLog.create({
        data: {
          apiKeyId,
          endpoint,
          method,
          ipAddress,
          statusCode,
          responseTime,
          userAgent,
          requestId,
        },
      });
    } catch (error) {
      // Don't throw errors for logging failures, just log them
      console.error("Failed to log API key usage:", error);
    }
  }

  /**
   * Get API key usage statistics
   */
  static async getApiKeyUsageStats(
    apiKeyId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    errorRequests: number;
    averageResponseTime: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    dailyUsage: Array<{ date: string; count: number }>;
  }> {
    try {
      // Verify ownership
      const apiKey = await prisma.apiKey.findFirst({
        where: { id: apiKeyId, userId },
      });

      if (!apiKey) {
        throw ApiError.notFound("API key not found");
      }

      const whereClause: any = { apiKeyId };
      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) whereClause.timestamp.gte = startDate;
        if (endDate) whereClause.timestamp.lte = endDate;
      }

      // Get basic stats
      const [
        totalRequests,
        successfulRequests,
        errorRequests,
        avgResponseTime,
      ] = await Promise.all([
        prisma.apiKeyUsageLog.count({ where: whereClause }),
        prisma.apiKeyUsageLog.count({
          where: { ...whereClause, statusCode: { gte: 200, lt: 400 } },
        }),
        prisma.apiKeyUsageLog.count({
          where: { ...whereClause, statusCode: { gte: 400 } },
        }),
        prisma.apiKeyUsageLog.aggregate({
          where: whereClause,
          _avg: { responseTime: true },
        }),
      ]);

      // Get top endpoints
      const topEndpoints = await prisma.apiKeyUsageLog.groupBy({
        by: ["endpoint"],
        where: whereClause,
        _count: { endpoint: true },
        orderBy: { _count: { endpoint: "desc" } },
        take: 10,
      });

      // Get daily usage (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyUsage = (await prisma.$queryRaw`
        SELECT
          DATE(timestamp) as date,
          COUNT(*) as count
        FROM api_key_usage_logs
        WHERE api_key_id = ${apiKeyId}
          AND timestamp >= ${thirtyDaysAgo}
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `) as Array<{ date: string; count: bigint }>;

      return {
        totalRequests,
        successfulRequests,
        errorRequests,
        averageResponseTime: Math.round(avgResponseTime._avg.responseTime || 0),
        topEndpoints: topEndpoints.map((item) => ({
          endpoint: item.endpoint,
          count: item._count.endpoint,
        })),
        dailyUsage: dailyUsage.map((item) => ({
          date: item.date,
          count: Number(item.count),
        })),
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("API Key Stats Error:", error);
      throw ApiError.internal("Failed to retrieve usage statistics");
    }
  }

  /**
   * Check if API key has permission
   */
  static hasPermission(
    permissions: string[],
    requiredPermission: string
  ): boolean {
    return (
      permissions.includes(requiredPermission) || permissions.includes("*")
    );
  }

  /**
   * Get available permissions
   */
  static getAvailablePermissions(): string[] {
    return [
      "sms:send",
      "sms:bulk",
      "sms:schedule",
      "sms:balance",
      "sms:status",
      "sms:logs",
      "otp:generate",
      "otp:verify",
      "contacts:read",
      "contacts:write",
      "templates:read",
      "templates:write",
      "analytics:read",
    ];
  }
}
