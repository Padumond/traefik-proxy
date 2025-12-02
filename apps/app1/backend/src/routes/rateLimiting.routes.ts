import { Router } from "express";
import { RateLimitingController } from "../controllers/rateLimiting.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
const expressValidator = require("express-validator");
const { body, param } = expressValidator;

const router = Router();

// Validation schemas
const resetRateLimitValidation = [
  param("apiKeyId").isUUID().withMessage("API key ID must be a valid UUID"),
];

const updateRateLimitValidation = [
  param("apiKeyId").isUUID().withMessage("API key ID must be a valid UUID"),
  body("rateLimit")
    .isInt({ min: 1, max: 100000 })
    .withMessage("Rate limit must be between 1 and 100000"),
];

const multipleStatusValidation = [
  body("keys")
    .isArray({ min: 1, max: 100 })
    .withMessage("Keys must be an array with 1-100 items"),
  body("keys.*").isString().withMessage("Each key must be a string"),
  body("keyPrefix")
    .optional()
    .isString()
    .withMessage("Key prefix must be a string"),
];

/**
 * @route GET /api/rate-limiting/status
 * @desc Get rate limit status for current API key
 * @access Private (API Key required)
 */
router.get("/status", authenticate, RateLimitingController.getRateLimitStatus);

/**
 * @route GET /api/rate-limiting/analytics
 * @desc Get rate limit analytics for current API key
 * @access Private (API Key required)
 */
router.get(
  "/analytics",
  authenticate,
  RateLimitingController.getRateLimitAnalytics
);

/**
 * @route GET /api/rate-limiting/configuration
 * @desc Get rate limiting configuration
 * @access Private
 */
router.get(
  "/configuration",
  authenticate,
  RateLimitingController.getConfiguration
);

/**
 * @route GET /api/rate-limiting/health
 * @desc Health check for rate limiting service
 * @access Private
 */
router.get("/health", authenticate, RateLimitingController.healthCheck);

/**
 * @route POST /api/rate-limiting/reset/:apiKeyId
 * @desc Reset rate limit for specific API key
 * @access Private (Admin only)
 */
router.post(
  "/reset/:apiKeyId",
  authenticate,
  resetRateLimitValidation,
  validateRequest,
  RateLimitingController.resetRateLimit
);

/**
 * @route GET /api/rate-limiting/system/analytics
 * @desc Get system-wide rate limiting analytics
 * @access Private (Admin only)
 */
router.get(
  "/system/analytics",
  authenticate,
  RateLimitingController.getSystemAnalytics
);

/**
 * @route POST /api/rate-limiting/cleanup
 * @desc Cleanup expired rate limit data
 * @access Private (Admin only)
 */
router.post("/cleanup", authenticate, RateLimitingController.cleanup);

/**
 * @route POST /api/rate-limiting/status/multiple
 * @desc Get rate limit status for multiple keys
 * @access Private (Admin only)
 */
router.post(
  "/status/multiple",
  authenticate,
  multipleStatusValidation,
  validateRequest,
  RateLimitingController.getMultipleStatus
);

/**
 * @route PUT /api/rate-limiting/api-key/:apiKeyId
 * @desc Update rate limit configuration for API key
 * @access Private (Admin only)
 */
router.put(
  "/api-key/:apiKeyId",
  authenticate,
  updateRateLimitValidation,
  validateRequest,
  RateLimitingController.updateApiKeyRateLimit
);

/**
 * @route GET /api/rate-limiting/metrics
 * @desc Get rate limiting metrics for monitoring
 * @access Private (Admin only)
 */
router.get("/metrics", authenticate, RateLimitingController.getMetrics);

export default router;
