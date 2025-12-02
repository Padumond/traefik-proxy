import { Router } from "express";
import { PricingController } from "../controllers/pricing.controller";
import { BillingController } from "../controllers/billing.controller";
import { ResellerDashboardController } from "../controllers/resellerDashboard.controller";
import { BalanceResellingController } from "../controllers/balanceReselling.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Pricing & Markup Routes
router.post("/pricing/calculate", PricingController.calculatePricing as any);
router.post("/pricing/test", PricingController.testMarkupRule as any);
router.get(
  "/pricing/recommendations",
  PricingController.getPricingRecommendations
);
router.get("/pricing/analytics", PricingController.getProfitAnalytics);

// Markup Rules Routes
router.post("/markup-rules", PricingController.createMarkupRule as any);
router.get("/markup-rules", PricingController.getMarkupRules);
router.put("/markup-rules/:id", PricingController.updateMarkupRule);
router.delete("/markup-rules/:id", PricingController.deleteMarkupRule);

// Billing Configuration Routes
router.get("/billing/config", BillingController.getBillingConfig);
router.put("/billing/config", BillingController.updateBillingConfig as any);
router.get("/billing/summary", BillingController.getBillingSummary);
router.get("/billing/analytics", BillingController.getBillingAnalytics);

// Invoice Management Routes
router.post("/billing/invoices", BillingController.createInvoice as any);
router.get("/billing/invoices", BillingController.getInvoices);
router.post("/billing/invoices/:id/pay", BillingController.markInvoicePaid);
router.post(
  "/billing/invoices/generate-monthly",
  BillingController.generateMonthlyInvoice as any
);

// Credit Management Routes
router.get("/billing/credit/balance", BillingController.getCreditBalance);
router.post("/billing/credit/add", BillingController.addCredit as any);
router.get(
  "/billing/credit/transactions",
  BillingController.getCreditTransactions
);

// Dashboard Routes
router.get(
  "/dashboard/overview",
  ResellerDashboardController.getDashboardOverview
);
router.get(
  "/dashboard/widgets",
  ResellerDashboardController.getDashboardWidgets
);
router.get("/dashboard/kpis", ResellerDashboardController.getKPIs);
router.get(
  "/dashboard/report",
  ResellerDashboardController.getBusinessReport as any
);

// Analytics Routes
router.get("/analytics/sms", ResellerDashboardController.getSmsAnalytics);
router.get(
  "/analytics/clients",
  ResellerDashboardController.getClientAnalytics
);
router.get("/analytics/profit-trends", ResellerDashboardController.getProfitTrends as any);
router.get(
  "/analytics/top-services",
  ResellerDashboardController.getTopPerformingServices
);
router.get(
  "/analytics/insights",
  ResellerDashboardController.getBusinessInsights
);
router.get(
  "/analytics/recent-transactions",
  ResellerDashboardController.getRecentTransactions
);

export default router;
