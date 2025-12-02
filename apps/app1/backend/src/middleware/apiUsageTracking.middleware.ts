import { Request, Response, NextFunction } from 'express';
import { ApiUsageAnalyticsService } from '../services/apiUsageAnalytics.service';

export interface TrackedRequest extends Request {
  startTime?: number;
  requestSize?: number;
  gatewayInfo?: {
    originalRoute?: string;
  };
}

/**
 * Middleware to track API usage
 */
export function trackApiUsage(req: TrackedRequest, res: Response, next: NextFunction) {
  // Record start time
  req.startTime = Date.now();

  // Calculate request size
  req.requestSize = Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8');

  // Override res.end to capture response data
  const originalEnd = res.end;
  let responseSize = 0;

  res.end = function(chunk?: any, encoding?: any) {
    if (chunk) {
      responseSize = Buffer.byteLength(chunk, encoding || 'utf8');
    }

    // Track the request after response is sent
    setImmediate(() => {
      trackRequestData(req, res, responseSize);
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Track request data
 */
async function trackRequestData(req: TrackedRequest, res: Response, responseSize: number) {
  try {
    // Only track if we have API key info (authenticated API requests)
    if (!req.apiKeyInfo) {
      return;
    }

    const responseTime = req.startTime ? Date.now() - req.startTime : 0;
    const endpoint = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    // Calculate cost based on endpoint and usage
    const cost = calculateRequestCost(endpoint, method, req.requestSize || 0, responseSize);

    await ApiUsageAnalyticsService.trackRequest({
      userId: req.apiKeyInfo.userId,
      apiKeyId: req.apiKeyInfo.apiKeyId,
      endpoint,
      method,
      statusCode,
      responseTime,
      cost,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      requestSize: req.requestSize,
      responseSize,
    });
  } catch (error) {
    console.error('Error tracking API usage:', error);
    // Don't throw error to avoid affecting API performance
  }
}

/**
 * Calculate request cost based on endpoint and usage
 */
function calculateRequestCost(
  endpoint: string,
  method: string,
  requestSize: number,
  responseSize: number
): number {
  // Base cost per request
  let baseCost = 0.001; // $0.001 per request

  // Endpoint-specific pricing
  const endpointMultipliers: Record<string, number> = {
    '/v1/sms/send': 0.02, // $0.02 per SMS
    '/v1/sms/bulk': 0.015, // $0.015 per SMS in bulk
    '/v1/otp/generate': 0.01, // $0.01 per OTP
    '/v1/otp/verify': 0.005, // $0.005 per verification
    '/v1/wallet/balance': 0.0001, // $0.0001 per balance check
    '/v1/analytics/sms': 0.0005, // $0.0005 per analytics request
  };

  // Get multiplier for endpoint
  const multiplier = endpointMultipliers[endpoint] || baseCost;

  // Calculate size-based cost (for large requests/responses)
  const sizeCost = (requestSize + responseSize) * 0.000001; // $0.000001 per byte

  return multiplier + sizeCost;
}

/**
 * Middleware to track API gateway requests specifically
 */
export function trackGatewayUsage(req: TrackedRequest, res: Response, next: NextFunction) {
  // Record start time for gateway requests
  req.startTime = Date.now();

  // Calculate request size
  const bodySize = req.body ? Buffer.byteLength(JSON.stringify(req.body), 'utf8') : 0;
  const headerSize = Object.keys(req.headers).reduce((total, key) => {
    return total + Buffer.byteLength(`${key}: ${req.headers[key]}`, 'utf8');
  }, 0);
  
  req.requestSize = bodySize + headerSize;

  // Override res.json to capture response data
  const originalJson = res.json;
  res.json = function(body: any) {
    const responseSize = Buffer.byteLength(JSON.stringify(body), 'utf8');
    
    // Track the request
    setImmediate(() => {
      trackGatewayRequestData(req, res, responseSize);
    });

    return originalJson.call(this, body);
  };

  next();
}

/**
 * Track gateway request data
 */
async function trackGatewayRequestData(req: TrackedRequest, res: Response, responseSize: number) {
  try {
    if (!req.apiKeyInfo) {
      return;
    }

    const responseTime = req.startTime ? Date.now() - req.startTime : 0;
    const endpoint = req.gatewayInfo?.originalRoute || req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    // Calculate cost for gateway requests
    const cost = calculateGatewayCost(endpoint, method, statusCode);

    await ApiUsageAnalyticsService.trackRequest({
      userId: req.apiKeyInfo.userId,
      apiKeyId: req.apiKeyInfo.apiKeyId,
      endpoint,
      method,
      statusCode,
      responseTime,
      cost,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      requestSize: req.requestSize,
      responseSize,
    });
  } catch (error) {
    console.error('Error tracking gateway usage:', error);
  }
}

/**
 * Calculate cost for gateway requests
 */
function calculateGatewayCost(endpoint: string, method: string, statusCode: number): number {
  // Different pricing for different endpoints
  const pricingTiers: Record<string, number> = {
    // SMS endpoints
    'sms/send': 0.02,
    'sms/bulk': 0.015,
    'sms/status': 0.001,
    'sms/history': 0.002,
    
    // OTP endpoints
    'otp/generate': 0.01,
    'otp/verify': 0.005,
    
    // Wallet endpoints
    'wallet/balance': 0.0001,
    'wallet/transactions': 0.0005,
    
    // Analytics endpoints
    'analytics/sms': 0.0005,
    'analytics/usage': 0.0005,
    
    // Default
    'default': 0.001,
  };

  // Find matching pricing tier
  let cost = pricingTiers.default;
  
  for (const [tier, price] of Object.entries(pricingTiers)) {
    if (endpoint.includes(tier)) {
      cost = price;
      break;
    }
  }

  // Apply status code multiplier
  if (statusCode >= 400) {
    cost *= 0.5; // Reduce cost for failed requests
  }

  return cost;
}

/**
 * Middleware to add usage headers to responses
 */
export function addUsageHeaders(req: Request, res: Response, next: NextFunction) {
  if (req.apiKeyInfo) {
    // Add usage information to response headers
    res.set({
      'X-Usage-Tracked': 'true',
      'X-API-Key-ID': req.apiKeyInfo.apiKeyId,
      'X-Request-ID': `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });
  }

  next();
}

/**
 * Middleware to track errors specifically
 */
export function trackApiErrors(error: any, req: Request, res: Response, next: NextFunction) {
  // Track error if it's an API request
  if (req.apiKeyInfo && error) {
    setImmediate(async () => {
      try {
        await ApiUsageAnalyticsService.trackRequest({
          userId: req.apiKeyInfo!.userId,
          apiKeyId: req.apiKeyInfo!.apiKeyId,
          endpoint: req.path,
          method: req.method,
          statusCode: error.statusCode || 500,
          responseTime: 0,
          cost: 0, // No cost for errors
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
        });
      } catch (trackingError) {
        console.error('Error tracking API error:', trackingError);
      }
    });
  }

  next(error);
}

/**
 * Get usage statistics for current request
 */
export function getRequestUsageStats(req: TrackedRequest): {
  responseTime?: number;
  requestSize?: number;
} {
  return {
    responseTime: req.startTime ? Date.now() - req.startTime : undefined,
    requestSize: req.requestSize,
  };
}
