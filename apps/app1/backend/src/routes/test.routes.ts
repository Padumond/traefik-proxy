import { Router } from "express";
import { TestController } from "../controllers/test.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

/**
 * @route GET /api/test/connection
 * @desc Test Arkessel API connection
 * @access Private
 */
router.get("/connection", authenticate, TestController.testConnection);

/**
 * @route GET /api/test/balance
 * @desc Get Arkessel account balance
 * @access Private
 */
router.get("/balance", authenticate, TestController.getBalance);

/**
 * @route POST /api/test/sms
 * @desc Send test SMS
 * @access Private
 */
router.post("/sms", authenticate, TestController.sendTestSms);

/**
 * @route POST /api/test/validate-phone
 * @desc Validate phone number format
 * @access Private
 */
router.post("/validate-phone", authenticate, TestController.validatePhone);

/**
 * @route POST /api/test/calculate-cost
 * @desc Calculate SMS cost
 * @access Private
 */
router.post("/calculate-cost", authenticate, TestController.calculateCost);

/**
 * @route GET /api/test/api-status
 * @desc Get API configuration status
 * @access Private
 */
router.get("/api-status", authenticate, TestController.getApiStatus);

/**
 * @route GET /api/test/public-status
 * @desc Get API configuration status (public for testing)
 * @access Public
 */
router.get("/public-status", TestController.getApiStatus);

export default router;
