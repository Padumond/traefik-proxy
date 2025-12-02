import express, { Request, Response, NextFunction } from "express";
import { SmsScheduleController } from "../controllers/smsSchedule.controller";
import {
  authenticate,
  isAdmin,
  checkSmsBalance,
} from "../middleware/auth.middleware";

const router = express.Router();

// Create wrapper functions to handle the Promise<Response> return type properly
// These wrappers convert Promise<Response> to Promise<void> as Express expects
const scheduleSmsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await SmsScheduleController.scheduleSms(req, res, next);
  } catch (error) {
    next(error);
  }
};

const scheduleBulkSmsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await SmsScheduleController.scheduleBulkSms(req, res, next);
  } catch (error) {
    next(error);
  }
};

const cancelScheduledSmsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await SmsScheduleController.cancelScheduledSms(req, res, next);
  } catch (error) {
    next(error);
  }
};

const getScheduledSmsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await SmsScheduleController.getScheduledSms(req, res, next);
  } catch (error) {
    next(error);
  }
};

const getAllScheduledSmsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await SmsScheduleController.getAllScheduledSms(req, res, next);
  } catch (error) {
    next(error);
  }
};

// User routes for scheduling SMS
router.post("/schedule", authenticate, checkSmsBalance, scheduleSmsHandler);
router.post(
  "/schedule-bulk",
  authenticate,
  checkSmsBalance,
  scheduleBulkSmsHandler
);
router.delete("/schedule/:id", authenticate, cancelScheduledSmsHandler);
router.get("/scheduled", authenticate, getScheduledSmsHandler);

// Admin routes for managing scheduled SMS
router.get(
  "/admin/scheduled",
  authenticate,
  isAdmin,
  getAllScheduledSmsHandler
);

export default router;
