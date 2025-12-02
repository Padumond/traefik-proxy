import { Router } from "express";
import { EnhancedWalletController } from "../controllers/enhancedWallet.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
const expressValidator = require("express-validator");
const { body, param, query } = expressValidator;

const router = Router();

// Validation schemas
const createTransactionValidation = [
  body("type")
    .isIn(["CREDIT", "DEBIT"])
    .withMessage("Type must be either CREDIT or DEBIT"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number"),
  body("description")
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Description must be between 1 and 500 characters"),
  body("reference")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Reference must be at most 100 characters"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
  body("externalTransactionId")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("External transaction ID must be at most 100 characters"),
];

const transactionIdValidation = [
  param("transactionId")
    .isUUID()
    .withMessage("Transaction ID must be a valid UUID"),
];

const cancelTransactionValidation = [
  ...transactionIdValidation,
  body("reason")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason must be at most 500 characters"),
];

const historyQueryValidation = [
  query("type")
    .optional()
    .isIn(["CREDIT", "DEBIT"])
    .withMessage("Type must be either CREDIT or DEBIT"),
  query("status")
    .optional()
    .isIn(["PENDING", "COMPLETED", "CANCELLED"])
    .withMessage("Status must be PENDING, COMPLETED, or CANCELLED"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),
  query("minAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Min amount must be a positive number"),
  query("maxAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Max amount must be a positive number"),
  query("reference")
    .optional()
    .isString()
    .trim()
    .withMessage("Reference must be a string"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be a non-negative integer"),
];

const statisticsValidation = [
  query("days")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Days must be between 1 and 365"),
];

const transferFundsValidation = [
  body("fromUserId").isUUID().withMessage("From user ID must be a valid UUID"),
  body("toUserId").isUUID().withMessage("To user ID must be a valid UUID"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number"),
  body("description")
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Description must be between 1 and 500 characters"),
  body("reference")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Reference must be at most 100 characters"),
];

const bulkProcessValidation = [
  body("transactionIds")
    .isArray({ min: 1, max: 50 })
    .withMessage("Transaction IDs must be an array with 1-50 items"),
  body("transactionIds.*")
    .isUUID()
    .withMessage("Each transaction ID must be a valid UUID"),
  body("action")
    .isIn(["complete", "cancel"])
    .withMessage("Action must be either complete or cancel"),
  body("reason")
    .if(body("action").equals("cancel"))
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage(
      "Reason is required for cancellation and must be between 1 and 500 characters"
    ),
];

/**
 * @route GET /api/wallet-enhanced/balance
 * @desc Get enhanced wallet balance with pending amounts
 * @access Private
 */
router.get(
  "/balance",
  authenticate,
  EnhancedWalletController.getEnhancedBalance
);

/**
 * @route POST /api/wallet-enhanced/transactions
 * @desc Create a new enhanced transaction
 * @access Private
 */
router.post(
  "/transactions",
  authenticate,
  createTransactionValidation,
  validateRequest,
  EnhancedWalletController.createEnhancedTransaction
);

/**
 * @route PUT /api/wallet-enhanced/transactions/:transactionId/complete
 * @desc Complete a pending transaction
 * @access Private
 */
router.put(
  "/transactions/:transactionId/complete",
  authenticate,
  transactionIdValidation,
  validateRequest,
  EnhancedWalletController.completeTransaction
);

/**
 * @route PUT /api/wallet-enhanced/transactions/:transactionId/cancel
 * @desc Cancel a pending transaction
 * @access Private
 */
router.put(
  "/transactions/:transactionId/cancel",
  authenticate,
  cancelTransactionValidation,
  validateRequest,
  EnhancedWalletController.cancelTransaction
);

/**
 * @route GET /api/wallet-enhanced/transactions
 * @desc Get enhanced transaction history
 * @access Private
 */
router.get(
  "/transactions",
  authenticate,
  historyQueryValidation,
  validateRequest,
  EnhancedWalletController.getEnhancedTransactionHistory
);

/**
 * @route GET /api/wallet-enhanced/statistics
 * @desc Get wallet statistics
 * @access Private
 */
router.get(
  "/statistics",
  authenticate,
  statisticsValidation,
  validateRequest,
  EnhancedWalletController.getWalletStatistics
);

/**
 * @route POST /api/wallet-enhanced/admin/transfer
 * @desc Transfer funds between users
 * @access Private (Admin)
 */
router.post(
  "/admin/transfer",
  authenticate,
  transferFundsValidation,
  validateRequest,
  EnhancedWalletController.transferFunds
);

/**
 * @route GET /api/wallet-enhanced/admin/pending
 * @desc Get pending transactions
 * @access Private (Admin)
 */
router.get(
  "/admin/pending",
  authenticate,
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be a non-negative integer"),
  validateRequest,
  EnhancedWalletController.getPendingTransactions
);

/**
 * @route POST /api/wallet-enhanced/admin/bulk-process
 * @desc Bulk process transactions
 * @access Private (Admin)
 */
router.post(
  "/admin/bulk-process",
  authenticate,
  bulkProcessValidation,
  validateRequest,
  EnhancedWalletController.bulkProcessTransactions
);

export default router;
