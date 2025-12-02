import { Request, Response, NextFunction } from "express";
import { ApiKeyService } from "../services/apiKey.service";
import { ApiError } from "../middleware/error.middleware";
import rateLimit from "express-rate-limit";
// import {
//   createApiKeyRateLimit,
//   createBurstProtection,
// } from "./rateLimiting.middleware";
// import { RateLimitConfigService } from "../services/rateLimitConfig.service";

// Extend Request interface to include API key info
declare global {
  namespace Express {
    interface Request {
      apiKeyInfo?: {
        userId: string;
        apiKeyId: string;
        permissions: string[];
        rateLimit: number;
      };
    }
  }
}

/**
 * Middleware to authenticate API keys
 */
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      throw ApiError.unauthorized("API key is required");
    }

    // Get client IP address
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      "unknown";

    // Authenticate the API key
    const authResult = await ApiKeyService.authenticateApiKey(
      apiKey,
      ipAddress
    );

    // Add API key info to request
    req.apiKeyInfo = authResult;

    // Log the API usage (async, don't wait)
    const responseTime = Date.now() - startTime;
    setImmediate(() => {
      ApiKeyService.logApiKeyUsage(
        authResult.apiKeyId,
        req.path,
        req.method,
        ipAddress,
        200, // Will be updated in response middleware
        responseTime,
        req.headers["user-agent"],
        req.headers["x-request-id"] as string
      );
    });

    next();
  } catch (error) {
    // Log failed authentication attempt
    const responseTime = Date.now() - startTime;
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.connection.remoteAddress ||
      "unknown";

    console.warn("API Key Authentication Failed:", {
      ip: ipAddress,
      path: req.path,
      method: req.method,
      userAgent: req.headers["user-agent"],
      error: error instanceof Error ? error.message : "Unknown error",
      responseTime,
    });

    next(error);
  }
};

/**
 * Middleware to check API key permissions
 */
export const requirePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.apiKeyInfo) {
        throw ApiError.unauthorized("API key authentication required");
      }

      const hasPermission = ApiKeyService.hasPermission(
        req.apiKeyInfo.permissions,
        requiredPermission
      );

      if (!hasPermission) {
        throw ApiError.forbidden(
          `Insufficient permissions. Required: ${requiredPermission}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Dynamic rate limiting based on API key configuration
 */
export const apiKeyRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.apiKeyInfo) {
    return next(ApiError.unauthorized("API key authentication required"));
  }

  const { rateLimit: keyRateLimit, apiKeyId } = req.apiKeyInfo;

  // Create a dynamic rate limiter for this API key
  const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: keyRateLimit,
    keyGenerator: () => apiKeyId, // Use API key ID as the rate limit key
    message: {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: `Rate limit exceeded. Maximum ${keyRateLimit} requests per hour allowed.`,
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Rate limit exceeded logging handled by express-rate-limit
  });

  limiter(req, res, next);
};

/**
 * Middleware to log API response details
 */
export const logApiResponse = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.apiKeyInfo) {
    return next();
  }

  const originalSend = res.send;
  const startTime = Date.now();

  res.send = function (body) {
    const responseTime = Date.now() - startTime;
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.connection.remoteAddress ||
      "unknown";

    // Log the API usage with actual response details
    setImmediate(() => {
      ApiKeyService.logApiKeyUsage(
        req.apiKeyInfo!.apiKeyId,
        req.path,
        req.method,
        ipAddress,
        res.statusCode,
        responseTime,
        req.headers["user-agent"],
        req.headers["x-request-id"] as string
      );
    });

    return originalSend.call(this, body);
  };

  next();
};

/**
 * Combined middleware for API key authentication with all features
 */
export const fullApiKeyAuth = [
  authenticateApiKey,
  apiKeyRateLimit,
  logApiResponse,
];

/**
 * Middleware for API key authentication with specific permission
 */
export const apiKeyAuthWithPermission = (permission: string) => [
  authenticateApiKey,
  requirePermission(permission),
  apiKeyRateLimit,
  logApiResponse,
];

/**
 * Middleware to validate API key format
 */
export const validateApiKeyFormat = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return next(ApiError.badRequest("API key is required"));
  }

  // Check if API key follows the expected format: msk_[64 hex characters]
  const apiKeyRegex = /^msk_[a-f0-9]{64}$/;

  if (!apiKeyRegex.test(apiKey)) {
    return next(ApiError.badRequest("Invalid API key format"));
  }

  next();
};

/**
 * Middleware to add security headers for API responses
 */
export const addApiSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Add security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Add API-specific headers
  res.setHeader("X-API-Version", "v1");
  res.setHeader("X-Rate-Limit-Window", "3600"); // 1 hour in seconds

  if (req.apiKeyInfo) {
    res.setHeader("X-Rate-Limit-Limit", req.apiKeyInfo.rateLimit.toString());
  }

  next();
};

/**
 * Error handler specifically for API key related errors
 */
export const handleApiKeyErrors = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log API key related errors
  if (error.statusCode === 401 || error.statusCode === 403) {
    console.warn("API Key Security Event:", {
      error: error.message,
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.headers["user-agent"],
      apiKey: req.headers["x-api-key"] ? "present" : "missing",
      timestamp: new Date().toISOString(),
    });
  }

  // Pass to general error handler
  next(error);
};

/**
 * Complete API gateway middleware stack
 */
export const apiGatewayMiddleware = [
  addApiSecurityHeaders,
  validateApiKeyFormat,
  authenticateApiKey,
  apiKeyRateLimit,
  logApiResponse,
  handleApiKeyErrors,
];
