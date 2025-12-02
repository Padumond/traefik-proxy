import express from "express";
import { SmsController } from "../controllers/sms.controller";
import {
  authenticate,
  isAdmin,
  checkSmsBalance,
} from "../middleware/auth.middleware";

const router = express.Router();

/**
 * @route POST /api/sms/send
 * @desc Send a single SMS
 * @access Private
 */
router.post("/send", authenticate, checkSmsBalance, SmsController.sendSms);

/**
 * @route POST /api/sms/bulk
 * @desc Send bulk SMS
 * @access Private
 */
router.post("/bulk", authenticate, checkSmsBalance, SmsController.sendBulkSms);

/**
 * @route GET /api/sms/logs
 * @desc Get SMS logs
 * @access Private
 */
router.get("/logs", authenticate, SmsController.getSmsLogs);

/**
 * @route GET /api/sms/:id
 * @desc Get SMS status by ID
 * @access Private
 */
router.get("/:id", authenticate, SmsController.getSmsStatus);

/**
 * @route GET /api/sms/admin/logs
 * @desc Get all SMS logs (admin only)
 * @access Admin
 */
router.get("/admin/logs", authenticate, isAdmin, SmsController.getAllSmsLogs);

export default router;
