import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from './apiKey.service';
import { ApiError } from '../middleware/error.middleware';

export interface RouteMapping {
  pattern: string;
  method: string;
  controller: string;
  action: string;
  permissions: string[];
  rateLimit?: number;
  validation?: any;
  middleware?: string[];
}

export interface GatewayRequest extends Request {
  apiKeyInfo?: {
    userId: string;
    apiKeyId: string;
    permissions: string[];
    rateLimit: number;
  };
  gatewayInfo?: {
    originalRoute: string;
    mappedRoute: string;
    routeParams: Record<string, string>;
    queryParams: Record<string, string>;
  };
}

export class ApiGatewayService {
  private static routeMappings: Map<string, RouteMapping> = new Map();

  /**
   * Initialize default route mappings
   */
  static initializeRoutes() {
    const defaultRoutes: RouteMapping[] = [
      // SMS Routes
      {
        pattern: '/v1/sms/send',
        method: 'POST',
        controller: 'ClientSmsController',
        action: 'sendSms',
        permissions: ['sms:send'],
        rateLimit: 100,
      },
      {
        pattern: '/v1/sms/bulk',
        method: 'POST',
        controller: 'ClientSmsController',
        action: 'sendBulkSms',
        permissions: ['sms:bulk'],
        rateLimit: 10,
      },
      {
        pattern: '/v1/sms/status/:messageId',
        method: 'GET',
        controller: 'ClientSmsController',
        action: 'getSmsStatus',
        permissions: ['sms:status'],
      },
      {
        pattern: '/v1/sms/history',
        method: 'GET',
        controller: 'ClientSmsController',
        action: 'getSmsHistory',
        permissions: ['sms:logs'],
      },
      {
        pattern: '/v1/sms/calculate-cost',
        method: 'POST',
        controller: 'ClientSmsController',
        action: 'calculateCost',
        permissions: ['sms:send'],
      },

      // Wallet Routes
      {
        pattern: '/v1/wallet/balance',
        method: 'GET',
        controller: 'ClientWalletController',
        action: 'getBalance',
        permissions: ['wallet:read'],
      },
      {
        pattern: '/v1/wallet/transactions',
        method: 'GET',
        controller: 'ClientWalletController',
        action: 'getTransactions',
        permissions: ['wallet:read'],
      },

      // OTP Routes
      {
        pattern: '/v1/otp/generate',
        method: 'POST',
        controller: 'ClientOtpController',
        action: 'generateOtp',
        permissions: ['otp:generate'],
        rateLimit: 60,
      },
      {
        pattern: '/v1/otp/verify',
        method: 'POST',
        controller: 'ClientOtpController',
        action: 'verifyOtp',
        permissions: ['otp:verify'],
        rateLimit: 120,
      },

      // Sender ID Routes
      {
        pattern: '/v1/sender-ids',
        method: 'GET',
        controller: 'ClientSenderIdController',
        action: 'getSenderIds',
        permissions: ['sender:read'],
      },
      {
        pattern: '/v1/sender-ids/request',
        method: 'POST',
        controller: 'ClientSenderIdController',
        action: 'requestSenderId',
        permissions: ['sender:write'],
      },

      // Analytics Routes
      {
        pattern: '/v1/analytics/sms',
        method: 'GET',
        controller: 'ClientAnalyticsController',
        action: 'getSmsAnalytics',
        permissions: ['analytics:read'],
      },
      {
        pattern: '/v1/analytics/usage',
        method: 'GET',
        controller: 'ClientAnalyticsController',
        action: 'getUsageAnalytics',
        permissions: ['analytics:read'],
      },
    ];

    defaultRoutes.forEach(route => {
      this.registerRoute(route);
    });
  }

  /**
   * Register a new route mapping
   */
  static registerRoute(mapping: RouteMapping) {
    const key = `${mapping.method}:${mapping.pattern}`;
    this.routeMappings.set(key, mapping);
  }

  /**
   * Find matching route for a request
   */
  static findRoute(method: string, path: string): {
    mapping: RouteMapping;
    params: Record<string, string>;
  } | null {
    for (const [key, mapping] of this.routeMappings) {
      const [routeMethod, routePattern] = key.split(':');
      
      if (routeMethod !== method) continue;

      const params = this.matchRoute(routePattern, path);
      if (params !== null) {
        return { mapping, params };
      }
    }

    return null;
  }

  /**
   * Match a route pattern against a path and extract parameters
   */
  private static matchRoute(pattern: string, path: string): Record<string, string> | null {
    // Convert pattern to regex
    const paramNames: string[] = [];
    const regexPattern = pattern.replace(/:([^/]+)/g, (match, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${regexPattern}$`);
    const match = path.match(regex);

    if (!match) return null;

    const params: Record<string, string> = {};
    paramNames.forEach((name, index) => {
      params[name] = match[index + 1];
    });

    return params;
  }

  /**
   * Validate request against route requirements
   */
  static validateRequest(
    req: GatewayRequest,
    mapping: RouteMapping
  ): { valid: boolean; error?: string } {
    // Check permissions
    if (!req.apiKeyInfo) {
      return { valid: false, error: 'API key authentication required' };
    }

    const hasPermission = mapping.permissions.some(permission =>
      ApiKeyService.hasPermission(req.apiKeyInfo!.permissions, permission)
    );

    if (!hasPermission) {
      return {
        valid: false,
        error: `Insufficient permissions. Required: ${mapping.permissions.join(' or ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Transform request for internal routing
   */
  static transformRequest(
    req: GatewayRequest,
    mapping: RouteMapping,
    params: Record<string, string>
  ) {
    // Add route parameters to request
    Object.assign(req.params, params);

    // Add gateway info
    req.gatewayInfo = {
      originalRoute: req.path,
      mappedRoute: mapping.pattern,
      routeParams: params,
      queryParams: req.query as Record<string, string>,
    };

    // Transform headers if needed
    this.transformHeaders(req);

    // Transform body if needed
    this.transformBody(req, mapping);
  }

  /**
   * Transform headers for internal API compatibility
   */
  private static transformHeaders(req: GatewayRequest) {
    // Add user ID from API key info
    if (req.apiKeyInfo) {
      req.headers['x-user-id'] = req.apiKeyInfo.userId;
      req.headers['x-api-key-id'] = req.apiKeyInfo.apiKeyId;
    }

    // Add request ID for tracing
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = this.generateRequestId();
    }
  }

  /**
   * Transform request body for internal API compatibility
   */
  private static transformBody(req: GatewayRequest, mapping: RouteMapping) {
    // Add common fields to body
    if (req.body && typeof req.body === 'object') {
      // Add user ID for internal processing
      if (req.apiKeyInfo && !req.body.userId) {
        req.body.userId = req.apiKeyInfo.userId;
      }

      // Add gateway metadata
      req.body._gateway = {
        originalRoute: req.gatewayInfo?.originalRoute,
        apiKeyId: req.apiKeyInfo?.apiKeyId,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate unique request ID
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get route documentation
   */
  static getRouteDocumentation(): Array<{
    pattern: string;
    method: string;
    description: string;
    permissions: string[];
    parameters?: Record<string, string>;
  }> {
    const docs: Array<{
      pattern: string;
      method: string;
      description: string;
      permissions: string[];
      parameters?: Record<string, string>;
    }> = [];

    for (const [key, mapping] of this.routeMappings) {
      const [method, pattern] = key.split(':');
      
      // Extract parameters from pattern
      const parameters: Record<string, string> = {};
      const paramMatches = pattern.match(/:([^/]+)/g);
      if (paramMatches) {
        paramMatches.forEach(param => {
          const paramName = param.substring(1);
          parameters[paramName] = 'string';
        });
      }

      docs.push({
        pattern,
        method,
        description: this.getRouteDescription(pattern, method),
        permissions: mapping.permissions,
        parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
      });
    }

    return docs.sort((a, b) => a.pattern.localeCompare(b.pattern));
  }

  /**
   * Get human-readable description for a route
   */
  private static getRouteDescription(pattern: string, method: string): string {
    const descriptions: Record<string, string> = {
      'POST:/v1/sms/send': 'Send a single SMS message',
      'POST:/v1/sms/bulk': 'Send SMS messages to multiple recipients',
      'GET:/v1/sms/status/:messageId': 'Get delivery status of an SMS message',
      'GET:/v1/sms/history': 'Get SMS sending history',
      'POST:/v1/sms/calculate-cost': 'Calculate cost for SMS sending',
      'GET:/v1/wallet/balance': 'Get account balance',
      'GET:/v1/wallet/transactions': 'Get wallet transaction history',
      'POST:/v1/otp/generate': 'Generate OTP code',
      'POST:/v1/otp/verify': 'Verify OTP code',
      'GET:/v1/sender-ids': 'Get approved sender IDs',
      'POST:/v1/sender-ids/request': 'Request new sender ID',
      'GET:/v1/analytics/sms': 'Get SMS analytics',
      'GET:/v1/analytics/usage': 'Get usage analytics',
    };

    return descriptions[`${method}:${pattern}`] || `${method} ${pattern}`;
  }

  /**
   * Health check for gateway service
   */
  static healthCheck(): {
    status: string;
    routesRegistered: number;
    timestamp: string;
  } {
    return {
      status: 'healthy',
      routesRegistered: this.routeMappings.size,
      timestamp: new Date().toISOString(),
    };
  }
}

// Initialize routes when service is loaded
ApiGatewayService.initializeRoutes();
