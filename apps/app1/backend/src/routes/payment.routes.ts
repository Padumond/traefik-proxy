import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
const expressValidator = require("express-validator");
const { body, param, query } = expressValidator;

const router = Router();

// Validation schemas
const createPaymentIntentValidation = [
  body("amount")
    .isFloat({ min: 1, max: 10000 })
    .withMessage("Amount must be between $1.00 and $10,000.00"),
  body("currency")
    .optional()
    .isIn(["USD", "EUR", "GBP"])
    .withMessage("Currency must be USD, EUR, or GBP"),
  body("paymentMethod")
    .optional()
    .isIn(["stripe", "paypal", "paystack"])
    .withMessage("Payment method must be stripe, paypal, or paystack"),
  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must be at most 500 characters"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
];

const paymentIntentIdValidation = [
  param("paymentIntentId")
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Payment intent ID is required"),
];

const paymentIdValidation = [
  param("paymentId").isUUID().withMessage("Payment ID must be a valid UUID"),
];

const paymentHistoryValidation = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be a non-negative integer"),
  query("status")
    .optional()
    .isIn(["PENDING", "COMPLETED", "FAILED", "REFUNDED", "DISPUTED"])
    .withMessage(
      "Status must be PENDING, COMPLETED, FAILED, REFUNDED, or DISPUTED"
    ),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),
];

const refundValidation = [
  ...paymentIdValidation,
  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Refund amount must be positive"),
  body("reason")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason must be at most 500 characters"),
];

const adminPaymentQueryValidation = [
  ...paymentHistoryValidation,
  query("paymentMethod")
    .optional()
    .isIn(["stripe", "paypal"])
    .withMessage("Payment method must be stripe or paypal"),
  query("userId")
    .optional()
    .isUUID()
    .withMessage("User ID must be a valid UUID"),
];

/**
 * @route POST /api/payments/intent
 * @desc Create payment intent
 * @access Private
 */
router.post(
  "/intent",
  authenticate,
  createPaymentIntentValidation,
  validateRequest,
  PaymentController.createPaymentIntent
);

/**
 * @route POST /api/payments/confirm/:paymentIntentId
 * @desc Confirm payment
 * @access Private
 */
router.post(
  "/confirm/:paymentIntentId",
  authenticate,
  paymentIntentIdValidation,
  validateRequest,
  PaymentController.confirmPayment
);

/**
 * @route DELETE /api/payments/intent/:paymentIntentId
 * @desc Cancel payment intent
 * @access Private
 */
router.delete(
  "/intent/:paymentIntentId",
  authenticate,
  paymentIntentIdValidation,
  validateRequest,
  PaymentController.cancelPaymentIntent
);

/**
 * @route GET /api/payments/history
 * @desc Get payment history for current user
 * @access Private
 */
router.get(
  "/history",
  authenticate,
  paymentHistoryValidation,
  validateRequest,
  PaymentController.getPaymentHistory
);

/**
 * @route GET /api/payments/receipts
 * @desc Get payment receipts for current user
 * @access Private
 */
router.get(
  "/receipts",
  authenticate,
  paymentHistoryValidation,
  validateRequest,
  PaymentController.getPaymentReceipts
);

/**
 * @route GET /api/payments/methods
 * @desc Get supported payment methods
 * @access Public
 */
router.get("/methods", PaymentController.getSupportedPaymentMethods);

/**
 * @route GET /api/payments/:paymentId
 * @desc Get payment details
 * @access Private
 */
router.get(
  "/:paymentId",
  authenticate,
  paymentIdValidation,
  validateRequest,
  PaymentController.getPaymentDetails
);

/**
 * @route POST /api/payments/webhook/stripe
 * @desc Handle Stripe webhook events
 * @access Public (Stripe webhook)
 */
router.post("/webhook/stripe", PaymentController.handleStripeWebhook);

/**
 * @route POST /api/payments/webhook/paystack
 * @desc Handle Paystack webhook events
 * @access Public (Paystack webhook)
 */
router.post("/webhook/paystack", PaymentController.handlePaystackWebhook);

/**
 * @route POST /api/payments/admin/refund/:paymentId
 * @desc Refund a payment
 * @access Private (Admin)
 */
router.post(
  "/admin/refund/:paymentId",
  authenticate,
  refundValidation,
  validateRequest,
  PaymentController.refundPayment
);

/**
 * @route GET /api/payments/admin/statistics
 * @desc Get payment statistics
 * @access Private (Admin)
 */
router.get(
  "/admin/statistics",
  authenticate,
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),
  validateRequest,
  PaymentController.getPaymentStatistics
);

/**
 * @route GET /api/payments/admin/all
 * @desc Get all payments
 * @access Private (Admin)
 */
router.get(
  "/admin/all",
  authenticate,
  adminPaymentQueryValidation,
  validateRequest,
  PaymentController.getAllPayments
);

export default router;
