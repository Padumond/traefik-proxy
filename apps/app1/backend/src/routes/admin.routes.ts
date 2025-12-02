import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication and admin middleware to all routes
router.use(authenticate);
router.use(isAdmin);

/**
 * @route GET /api/admin/dashboard/admin
 * @desc Get admin dashboard statistics
 * @access Private (Admin)
 */
router.get("/dashboard/admin", AdminController.getAdminDashboardStats);

/**
 * @route GET /api/admin/reports/system
 * @desc Get system reports
 * @access Private (Admin)
 */
router.get("/reports/system", AdminController.getSystemReports);

/**
 * @route POST /api/admin/reports/export
 * @desc Export system reports
 * @access Private (Admin)
 */
router.post("/reports/export", AdminController.exportReport);

export default router;
