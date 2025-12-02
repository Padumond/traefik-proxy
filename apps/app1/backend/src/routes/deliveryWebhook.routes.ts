import express from "express";
import { DeliveryWebhookController, SmsAnalyticsController } from "../controllers/deliveryWebhook.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";

const router = express.Router();

/**
 * @route POST /api/webhooks/delivery/arkessel
 * @desc Handle Arkessel delivery status webhook
 * @access Public (webhook)
 */
router.post(
  "/arkessel",
  DeliveryWebhookController.handleDeliveryWebhook.bind(DeliveryWebhookController)
);

/**
 * @route POST /api/webhooks/delivery/arkessel/bulk
 * @desc Handle Arkessel bulk delivery status webhook
 * @access Public (webhook)
 */
router.post(
  "/arkessel/bulk",
  DeliveryWebhookController.handleBulkDeliveryWebhook.bind(DeliveryWebhookController)
);

/**
 * @route GET /api/webhooks/delivery/health
 * @desc Webhook health check
 * @access Public
 */
router.get(
  "/health",
  DeliveryWebhookController.webhookHealthCheck.bind(DeliveryWebhookController)
);

/**
 * @route POST /api/webhooks/delivery/sync
 * @desc Manually sync delivery statuses
 * @access Admin
 */
router.post(
  "/sync",
  authenticate,
  isAdmin,
  DeliveryWebhookController.manualSyncDeliveries.bind(DeliveryWebhookController)
);

/**
 * @route GET /api/webhooks/delivery/stats
 * @desc Get delivery statistics for authenticated user
 * @access Private
 */
router.get(
  "/stats",
  authenticate,
  DeliveryWebhookController.getDeliveryStats.bind(DeliveryWebhookController)
);

/**
 * @route GET /api/analytics/sms
 * @desc Get comprehensive SMS analytics
 * @access Private
 */
router.get(
  "/analytics/sms",
  authenticate,
  SmsAnalyticsController.getSmsAnalytics.bind(SmsAnalyticsController)
);

/**
 * @route GET /api/analytics/performance
 * @desc Get SMS performance metrics
 * @access Private
 */
router.get(
  "/analytics/performance",
  authenticate,
  SmsAnalyticsController.getPerformanceMetrics.bind(SmsAnalyticsController)
);

export default router;
