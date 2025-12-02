import { Router } from "express";
import { ApiUsageAnalyticsController } from "../controllers/apiUsageAnalytics.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
const expressValidator = require("express-validator");
const { query } = expressValidator;

const router = Router();

// Validation schemas
const dateRangeValidation = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),
];

const analyticsQueryValidation = [
  ...dateRangeValidation,
  query("endpoint")
    .optional()
    .isString()
    .trim()
    .withMessage("Endpoint must be a string"),
  query("method")
    .optional()
    .isIn(["GET", "POST", "PUT", "DELETE", "PATCH"])
    .withMessage("Method must be a valid HTTP method"),
  query("statusCode")
    .optional()
    .isInt({ min: 100, max: 599 })
    .withMessage("Status code must be a valid HTTP status code"),
];

const topConsumersValidation = [
  ...dateRangeValidation,
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

const dashboardValidation = [
  query("period")
    .optional()
    .isIn(["24h", "7d", "30d", "90d"])
    .withMessage("Period must be one of: 24h, 7d, 30d, 90d"),
];

const exportValidation = [
  ...dateRangeValidation,
  query("format")
    .optional()
    .isIn(["json", "csv"])
    .withMessage("Format must be either json or csv"),
];

const realTimeValidation = [
  query("date")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Date must be in YYYY-MM-DD format"),
];

/**
 * @route GET /api/analytics/user
 * @desc Get user analytics
 * @access Private
 */
router.get(
  "/user",
  authenticate,
  analyticsQueryValidation,
  validateRequest,
  ApiUsageAnalyticsController.getUserAnalytics
);

/**
 * @route GET /api/analytics/realtime
 * @desc Get real-time analytics
 * @access Private
 */
router.get(
  "/realtime",
  authenticate,
  realTimeValidation,
  validateRequest,
  ApiUsageAnalyticsController.getRealTimeAnalytics
);

/**
 * @route GET /api/analytics/billing
 * @desc Get billing metrics
 * @access Private
 */
router.get(
  "/billing",
  authenticate,
  dateRangeValidation,
  validateRequest,
  ApiUsageAnalyticsController.getBillingMetrics
);

/**
 * @route GET /api/analytics/dashboard
 * @desc Get analytics dashboard data
 * @access Private
 */
router.get(
  "/dashboard",
  authenticate,
  dashboardValidation,
  validateRequest,
  ApiUsageAnalyticsController.getDashboardData
);

/**
 * @route GET /api/analytics/summary
 * @desc Get analytics summary
 * @access Private
 */
router.get(
  "/summary",
  authenticate,
  ApiUsageAnalyticsController.getAnalyticsSummary
);

/**
 * @route GET /api/analytics/export
 * @desc Export analytics data
 * @access Private
 */
router.get(
  "/export",
  authenticate,
  exportValidation,
  validateRequest,
  ApiUsageAnalyticsController.exportAnalytics
);

/**
 * @route GET /api/analytics/admin/top-consumers
 * @desc Get top API consumers
 * @access Private (Admin)
 */
router.get(
  "/admin/top-consumers",
  authenticate,
  topConsumersValidation,
  validateRequest,
  ApiUsageAnalyticsController.getTopConsumers
);

/**
 * @route GET /api/analytics/admin/system
 * @desc Get system-wide analytics
 * @access Private (Admin)
 */
router.get(
  "/admin/system",
  authenticate,
  dateRangeValidation,
  validateRequest,
  ApiUsageAnalyticsController.getSystemAnalytics
);

export default router;
