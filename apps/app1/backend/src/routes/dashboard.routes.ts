import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import { DashboardController } from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/auth.middleware";
import { prisma } from "../server";

const router = Router();

// Development test endpoint - no authentication required
router.get("/test", function (req: Request, res: Response, next: NextFunction) {
  DashboardController.getTestData(req, res, next);
});

// Test Arkessel API directly (for debugging) - no authentication required
router.get("/test-arkessel-public", async (req: Request, res: Response) => {
  try {
    const { ArkeselService } = await import("../services/arkessel.service");
    const balance = await ArkeselService.getBalance();
    res.json({
      success: true,
      message: "Arkessel API test successful",
      data: balance,
    });
  } catch (error) {
    res.json({
      success: false,
      message: "Arkessel API test failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// All other routes require authentication
router.use(authenticate);

// Check current user role (for debugging)
router.get("/check-user", async (req: Request, res: Response) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      message: "User info retrieved",
      data: {
        id: user?.id,
        email: user?.email,
        role: user?.role,
        name: user?.name,
      },
    });
  } catch (error) {
    res.json({
      success: false,
      message: "Failed to get user info",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Test admin dashboard stats without admin role check (for debugging)
router.get("/test-admin-stats", async (req: Request, res: Response) => {
  try {
    const { AdminController } = await import("../controllers/admin.controller");
    // Temporarily bypass admin check by setting user role
    const originalUser = req.user;
    req.user = { ...originalUser, role: "ADMIN" } as any;

    await AdminController.getAdminDashboardStats(req, res, () => {});
  } catch (error) {
    res.json({
      success: false,
      message: "Failed to get admin stats",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get all dashboard data (stats, recent messages, recent transactions)
router.get("/", DashboardController.getDashboardData);

// Get dashboard stats only
router.get("/stats", DashboardController.getDashboardStats);

// Get recent messages
router.get("/messages/recent", DashboardController.getRecentMessages);

// Get average success rate
router.get("/success-rate", DashboardController.getAverageSuccessRate);

// Get recent transactions
router.get("/transactions/recent", DashboardController.getRecentTransactions);

// Get SMS balance from Arkessel
router.get("/sms-balance", DashboardController.getSmsBalance);

// Test Arkessel API directly (for debugging)
router.get("/test-arkessel", async (req: Request, res: Response) => {
  try {
    const { ArkeselService } = await import("../services/arkessel.service");
    const balance = await ArkeselService.getBalance();
    res.json({
      success: true,
      message: "Arkessel API test successful",
      data: balance,
    });
  } catch (error) {
    res.json({
      success: false,
      message: "Arkessel API test failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
