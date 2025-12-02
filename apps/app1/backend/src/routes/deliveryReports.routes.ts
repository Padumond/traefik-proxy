import { Router } from "express";
import { DeliveryReportsController } from "../controllers/deliveryReports.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Real-time Dashboard
router.get(
  "/dashboard/realtime",
  DeliveryReportsController.getRealTimeDashboard
);

// Analytics
router.get("/analytics", DeliveryReportsController.getDeliveryAnalytics);
router.get(
  "/analytics/performance",
  DeliveryReportsController.getPerformanceMetrics
);
router.get(
  "/analytics/insights",
  DeliveryReportsController.getDeliveryInsights
);

// Delivery Reports
router.get("/reports", DeliveryReportsController.getDeliveryReports);
router.get(
  "/reports/:messageId",
  DeliveryReportsController.getDeliveryReport as any
);
router.get("/reports/export", DeliveryReportsController.exportDeliveryReports);

// Status Summary
router.get(
  "/status/summary",
  DeliveryReportsController.getDeliveryStatusSummary
);

export default router;
