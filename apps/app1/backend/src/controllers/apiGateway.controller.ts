import { Response, NextFunction } from "express";
import {
  ApiGatewayService,
  GatewayRequest,
} from "../services/apiGateway.service";
import { ApiError } from "../middleware/error.middleware";

// Import all client controllers
import { ClientSmsController } from "./clientSms.controller";
import { ClientWalletController } from "./clientWallet.controller";
import { ClientOtpController } from "./clientOtp.controller";
import { ClientSenderIdController } from "./clientSenderId.controller";

export class ApiGatewayController {
  /**
   * Main gateway handler - routes all API requests
   */
  static async handleRequest(
    req: GatewayRequest,
    res: Response,
    next: NextFunction
  ) {
    const startTime = Date.now();

    try {
      // Extract the actual API path from the gateway route
      // req.path will be something like "/v1/sms/send"
      // We need to match it against our route patterns
      const apiPath = req.path.startsWith("/v1") ? req.path : `/v1${req.path}`;

      // Find matching route
      const routeMatch = ApiGatewayService.findRoute(req.method, apiPath);

      if (!routeMatch) {
        throw ApiError.notFound(
          `API endpoint not found: ${req.method} ${apiPath}`
        );
      }

      const { mapping, params } = routeMatch;

      // Validate request against route requirements
      const validation = ApiGatewayService.validateRequest(req, mapping);
      if (!validation.valid) {
        throw ApiError.forbidden(validation.error!);
      }

      // Transform request for internal routing
      ApiGatewayService.transformRequest(req, mapping, params);

      // Log the gateway routing
      console.log("API Gateway Routing:", {
        originalPath: req.path,
        apiPath: apiPath,
        method: req.method,
        mappedTo: `${mapping.controller}.${mapping.action}`,
        userId: req.apiKeyInfo?.userId,
        apiKeyId: req.apiKeyInfo?.apiKeyId,
        requestId: req.headers["x-request-id"],
      });

      // Route to appropriate controller
      await this.routeToController(req, res, next, mapping);
    } catch (error) {
      // Log gateway errors
      const responseTime = Date.now() - startTime;
      console.error("API Gateway Error:", {
        path: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime,
        userId: req.apiKeyInfo?.userId,
        requestId: req.headers["x-request-id"],
      });

      next(error);
    }
  }

  /**
   * Route request to appropriate controller based on mapping
   */
  private static async routeToController(
    req: GatewayRequest,
    res: Response,
    next: NextFunction,
    mapping: any
  ) {
    const { controller, action } = mapping;

    try {
      switch (controller) {
        case "ClientSmsController":
          await this.callControllerAction(
            ClientSmsController,
            action,
            req,
            res,
            next
          );
          break;

        case "ClientWalletController":
          await this.callControllerAction(
            ClientWalletController,
            action,
            req,
            res,
            next
          );
          break;

        case "ClientOtpController":
          await this.callControllerAction(
            ClientOtpController,
            action,
            req,
            res,
            next
          );
          break;

        case "ClientSenderIdController":
          await this.callControllerAction(
            ClientSenderIdController,
            action,
            req,
            res,
            next
          );
          break;

        case "ClientAnalyticsController":
          // Analytics controller will be implemented later
          res.status(501).json({
            success: false,
            error: {
              code: "NOT_IMPLEMENTED",
              message: "Analytics endpoints are not yet implemented",
            },
          });
          break;

        default:
          throw ApiError.internal(`Unknown controller: ${controller}`);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Dynamically call controller action
   */
  private static async callControllerAction(
    controllerClass: any,
    action: string,
    req: GatewayRequest,
    res: Response,
    next: NextFunction
  ) {
    if (typeof controllerClass[action] !== "function") {
      throw ApiError.internal(`Action ${action} not found in controller`);
    }

    // Call the controller action
    await controllerClass[action](req, res, next);
  }

  /**
   * Get API documentation
   */
  static async getApiDocumentation(
    req: GatewayRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const documentation = ApiGatewayService.getRouteDocumentation();

      res.json({
        success: true,
        message: "API documentation retrieved successfully",
        data: {
          version: "v1",
          baseUrl: "/api/gateway",
          authentication: "API Key (x-api-key header)",
          routes: documentation,
          rateLimit: "Per API key configuration",
          supportedFormats: ["JSON"],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Health check endpoint
   */
  static async healthCheck(
    req: GatewayRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const health = ApiGatewayService.healthCheck();

      res.json({
        success: true,
        message: "API Gateway is healthy",
        data: health,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API key information (for debugging)
   */
  static async getApiKeyInfo(
    req: GatewayRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.apiKeyInfo) {
        throw ApiError.unauthorized("API key authentication required");
      }

      res.json({
        success: true,
        message: "API key information retrieved successfully",
        data: {
          userId: req.apiKeyInfo.userId,
          permissions: req.apiKeyInfo.permissions,
          rateLimit: req.apiKeyInfo.rateLimit,
          requestInfo: req.gatewayInfo,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle preflight OPTIONS requests
   */
  static async handleOptions(
    req: GatewayRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Find matching route for the actual method
      const actualMethod = req.headers[
        "access-control-request-method"
      ] as string;
      const routeMatch = ApiGatewayService.findRoute(
        actualMethod || "GET",
        req.path
      );

      if (!routeMatch) {
        throw ApiError.notFound(
          `API endpoint not found: ${actualMethod} ${req.path}`
        );
      }

      // Return allowed methods and headers
      res.set({
        "Access-Control-Allow-Methods": actualMethod,
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, x-api-key, x-request-id",
        "Access-Control-Max-Age": "86400", // 24 hours
      });

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle unsupported methods
   */
  static async handleUnsupportedMethod(
    req: GatewayRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Check if the path exists with different methods
      const supportedMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      const availableMethods: string[] = [];

      for (const method of supportedMethods) {
        const routeMatch = ApiGatewayService.findRoute(method, req.path);
        if (routeMatch) {
          availableMethods.push(method);
        }
      }

      if (availableMethods.length > 0) {
        res.set("Allow", availableMethods.join(", "));
        throw ApiError.methodNotAllowed(
          `Method ${
            req.method
          } not allowed. Supported methods: ${availableMethods.join(", ")}`
        );
      } else {
        throw ApiError.notFound(
          `API endpoint not found: ${req.method} ${req.path}`
        );
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Middleware to add gateway context to requests
   */
  static addGatewayContext(
    req: GatewayRequest,
    res: Response,
    next: NextFunction
  ) {
    // Add gateway-specific headers
    res.set({
      "X-API-Gateway": "Mas3ndi-v1",
      "X-Request-ID": req.headers["x-request-id"] as string,
    });

    // Add timing information
    const startTime = Date.now();
    res.on("finish", () => {
      const responseTime = Date.now() - startTime;
      res.set("X-Response-Time", `${responseTime}ms`);
    });

    next();
  }

  /**
   * Error handler for gateway-specific errors
   */
  static handleGatewayError(
    error: any,
    req: GatewayRequest,
    res: Response,
    next: NextFunction
  ) {
    // Log gateway-specific errors
    console.error("API Gateway Error:", {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      userId: req.apiKeyInfo?.userId,
      apiKeyId: req.apiKeyInfo?.apiKeyId,
      requestId: req.headers["x-request-id"],
      timestamp: new Date().toISOString(),
    });

    // Add gateway-specific error context
    if (error instanceof ApiError) {
      error.context = {
        ...error.context,
        gateway: true,
        originalPath: req.path,
        mappedRoute: req.gatewayInfo?.mappedRoute,
      };
    }

    // Pass to general error handler
    next(error);
  }
}
