import express from "express";
import { ApiGatewayController } from "../controllers/apiGateway.controller";
import {
  apiGatewayMiddleware,
  addApiSecurityHeaders,
  validateApiKeyFormat,
  authenticateApiKey,
  apiKeyRateLimit,
  logApiResponse,
  handleApiKeyErrors,
} from "../middleware/apiKeyAuth.middleware";
// import {
//   trackGatewayUsage,
//   addUsageHeaders,
//   trackApiErrors,
// } from "../middleware/apiUsageTracking.middleware";

const router = express.Router();

// Apply gateway middleware to all routes
router.use(addApiSecurityHeaders);
router.use(validateApiKeyFormat);
router.use(authenticateApiKey);
router.use(apiKeyRateLimit);
// router.use(addUsageHeaders);
// router.use(trackGatewayUsage);
router.use(logApiResponse);
router.use(ApiGatewayController.addGatewayContext);

/**
 * @route GET /gateway/docs
 * @desc Get API documentation
 * @access API Key
 */
router.get("/docs", ApiGatewayController.getApiDocumentation);

/**
 * @route GET /gateway/health
 * @desc Health check endpoint
 * @access API Key
 */
router.get("/health", ApiGatewayController.healthCheck);

/**
 * @route GET /gateway/info
 * @desc Get API key information
 * @access API Key
 */
router.get("/info", ApiGatewayController.getApiKeyInfo);

/**
 * @route OPTIONS /gateway/*
 * @desc Handle preflight requests
 * @access API Key
 */
router.options("*", ApiGatewayController.handleOptions);

/**
 * @route ALL /gateway/v1/*
 * @desc Main gateway handler for all API requests
 * @access API Key
 */
router.all("/v1/*", ApiGatewayController.handleRequest);

/**
 * @route ALL /gateway/*
 * @desc Catch-all for unsupported routes
 * @access API Key
 */
router.all("*", ApiGatewayController.handleUnsupportedMethod);

// Error handler for gateway-specific errors
router.use(ApiGatewayController.handleGatewayError);
router.use(handleApiKeyErrors);

export default router;
