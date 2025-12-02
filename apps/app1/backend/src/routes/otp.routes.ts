import { Router } from "express";
import { OtpController } from "../controllers/otp.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// OTP Management Routes
router.post("/generate", OtpController.generateOtp as any);
router.post("/verify", OtpController.verifyOtp as any);
router.post("/resend", OtpController.resendOtp as any);
router.get("/status", OtpController.getOtpStatus as any);
router.post("/cancel", OtpController.cancelOtp as any);
router.get("/analytics", OtpController.getOtpAnalytics);

// OTP Template Routes
router.post("/templates", OtpController.createTemplate as any);
router.get("/templates", OtpController.getTemplates);
router.post("/templates/preview", OtpController.previewTemplate as any);

export default router;
