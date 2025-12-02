import { Router } from "express";
import { ApiKeyController } from "../controllers/apiKey.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
const expressValidator = require("express-validator");
const { body, param, query } = expressValidator;

const router = Router();

// Validation schemas
const createApiKeyValidation = [
  body("name")
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be between 1 and 100 characters"),
  body("permissions")
    .optional()
    .isArray()
    .withMessage("Permissions must be an array"),
  body("permissions.*")
    .optional()
    .isString()
    .withMessage("Each permission must be a string"),
  body("ipWhitelist")
    .optional()
    .isArray()
    .withMessage("IP whitelist must be an array"),
  body("ipWhitelist.*")
    .optional()
    .isIP()
    .withMessage("Each IP address must be valid"),
  body("rateLimit")
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage("Rate limit must be between 1 and 10000"),
  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("Expiration date must be a valid ISO 8601 date"),
];

const updateApiKeyValidation = [
  param("id").isUUID().withMessage("API key ID must be a valid UUID"),
  body("name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be between 1 and 100 characters"),
  body("permissions")
    .optional()
    .isArray()
    .withMessage("Permissions must be an array"),
  body("permissions.*")
    .optional()
    .isString()
    .withMessage("Each permission must be a string"),
  body("ipWhitelist")
    .optional()
    .isArray()
    .withMessage("IP whitelist must be an array"),
  body("ipWhitelist.*")
    .optional()
    .isIP()
    .withMessage("Each IP address must be valid"),
  body("rateLimit")
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage("Rate limit must be between 1 and 10000"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  body("expiresAt")
    .optional()
    .custom((value) => {
      if (value === null) return true; // Allow null to remove expiration
      if (!value) return true; // Allow undefined/empty
      return new Date(value).toString() !== "Invalid Date";
    })
    .withMessage("Expiration date must be a valid date or null"),
];

const apiKeyIdValidation = [
  param("id").isUUID().withMessage("API key ID must be a valid UUID"),
];

const usageStatsValidation = [
  param("id").isUUID().withMessage("API key ID must be a valid UUID"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),
];

/**
 * @route POST /api/api-keys
 * @desc Create a new API key
 * @access Private (Client users only)
 */
router.post(
  "/",
  authenticate,
  createApiKeyValidation,
  validateRequest,
  ApiKeyController.createApiKey
);

/**
 * @route GET /api/api-keys
 * @desc Get all API keys for the authenticated user
 * @access Private (Client users only)
 */
router.get("/", authenticate, ApiKeyController.getUserApiKeys);

/**
 * @route GET /api/api-keys/permissions
 * @desc Get available permissions
 * @access Private
 */
router.get(
  "/permissions",
  authenticate,
  ApiKeyController.getAvailablePermissions
);

/**
 * @route GET /api/api-keys/:id
 * @desc Get a specific API key by ID
 * @access Private (Client users only)
 */
router.get(
  "/:id",
  authenticate,
  apiKeyIdValidation,
  validateRequest,
  ApiKeyController.getApiKeyById
);

/**
 * @route PUT /api/api-keys/:id
 * @desc Update an API key
 * @access Private (Client users only)
 */
router.put(
  "/:id",
  authenticate,
  updateApiKeyValidation,
  validateRequest,
  ApiKeyController.updateApiKey
);

/**
 * @route DELETE /api/api-keys/:id
 * @desc Delete an API key
 * @access Private (Client users only)
 */
router.delete(
  "/:id",
  authenticate,
  apiKeyIdValidation,
  validateRequest,
  ApiKeyController.deleteApiKey
);

/**
 * @route POST /api/api-keys/:id/regenerate
 * @desc Regenerate an API key
 * @access Private (Client users only)
 */
router.post(
  "/:id/regenerate",
  authenticate,
  apiKeyIdValidation,
  validateRequest,
  ApiKeyController.regenerateApiKey
);

/**
 * @route GET /api/api-keys/:id/usage
 * @desc Get usage statistics for an API key
 * @access Private (Client users only)
 */
router.get(
  "/:id/usage",
  authenticate,
  usageStatsValidation,
  validateRequest,
  ApiKeyController.getApiKeyUsageStats
);

export default router;
