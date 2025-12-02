import { Router } from "express";
import { DeliveryTrackingController } from "../controllers/deliveryTracking.controller";
import { WebhookController } from "../controllers/webhook.controller";
import { DeliveryAnalyticsController } from "../controllers/deliveryAnalytics.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to most routes (except webhook receiver)
router.use("/tracking", authenticate);
router.use("/webhooks", authenticate);
router.use("/analytics", authenticate);

// Delivery Tracking Routes
router.get("/tracking/reports", DeliveryTrackingController.getDeliveryReports);
router.get(
  "/tracking/reports/:messageId",
  DeliveryTrackingController.getDeliveryReport as any
);
router.get(
  "/tracking/statistics",
  DeliveryTrackingController.getDeliveryStatistics
);
router.get("/tracking/summary", DeliveryTrackingController.getDeliverySummary);
router.get(
  "/tracking/search",
  DeliveryTrackingController.searchDeliveryReports as any
);
router.get(
  "/tracking/export",
  DeliveryTrackingController.exportDeliveryReports
);
router.post(
  "/tracking/status",
  DeliveryTrackingController.updateDeliveryStatus as any
);
router.post(
  "/tracking/bulk-status",
  DeliveryTrackingController.bulkUpdateDeliveryStatus as any
);

// Webhook Management Routes
router.post("/webhooks/configs", WebhookController.createWebhookConfig as any);
router.get("/webhooks/configs", WebhookController.getWebhookConfigs);
router.get("/webhooks/configs/:id", WebhookController.getWebhookConfig as any);
router.put("/webhooks/configs/:id", WebhookController.updateWebhookConfig);
router.delete("/webhooks/configs/:id", WebhookController.deleteWebhookConfig);
router.post("/webhooks/configs/:id/test", WebhookController.testWebhook);
router.post(
  "/webhooks/configs/:id/toggle",
  WebhookController.toggleWebhookStatus as any
);

// Webhook Logs & Monitoring
router.get("/webhooks/logs", WebhookController.getWebhookLogs);
router.post("/webhooks/logs/:logId/retry", WebhookController.retryWebhook);
router.get("/webhooks/statistics", WebhookController.getWebhookStatistics);
router.get("/webhooks/events", WebhookController.getAvailableEvents);

// Analytics Routes
router.get(
  "/analytics/overview",
  DeliveryAnalyticsController.getDeliveryAnalytics
);
router.get(
  "/analytics/dashboard",
  DeliveryAnalyticsController.getAnalyticsDashboard
);
router.get(
  "/analytics/performance",
  DeliveryAnalyticsController.getPerformanceMetrics
);
router.get("/analytics/insights", DeliveryAnalyticsController.generateInsights);
router.get("/analytics/trends", DeliveryAnalyticsController.getDeliveryTrends);
router.get(
  "/analytics/countries",
  DeliveryAnalyticsController.getCountryBreakdown
);
router.get(
  "/analytics/services",
  DeliveryAnalyticsController.getServiceBreakdown
);
router.get(
  "/analytics/hourly",
  DeliveryAnalyticsController.getHourlyDistribution
);
router.get(
  "/analytics/failures",
  DeliveryAnalyticsController.getFailureAnalysis
);
router.post(
  "/analytics/compare",
  DeliveryAnalyticsController.comparePeriods as any
);

// Public webhook receiver endpoint (no authentication)
router.post("/webhook/receive", WebhookController.receiveWebhook);

export default router;
