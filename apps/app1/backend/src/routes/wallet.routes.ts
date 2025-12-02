import express from "express";
import { WalletController } from "../controllers/wallet.controller";
import { WalletTopupController } from "../controllers/walletTopup.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";

const router = express.Router();

/**
 * @route GET /api/wallet/balance
 * @desc Get wallet balance
 * @access Private
 */
router.get("/balance", authenticate, WalletController.getWalletBalance);

/**
 * @route GET /api/wallet/transactions
 * @desc Get transaction history
 * @access Private
 */
router.get(
  "/transactions",
  authenticate,
  WalletController.getTransactionHistory
);

/**
 * @route POST /api/wallet/credit
 * @desc Add credit to user wallet (admin only)
 * @access Admin
 */
router.post("/credit", authenticate, isAdmin, WalletController.adminAddCredit);

/**
 * @route POST /api/wallet/debit
 * @desc Deduct credit from user wallet (admin only)
 * @access Admin
 */
router.post(
  "/debit",
  authenticate,
  isAdmin,
  WalletController.adminDeductCredit
);

/**
 * @route GET /api/wallet/users/:userId/balance
 * @desc Get user wallet balance (admin only)
 * @access Admin
 */
router.get(
  "/users/:userId/balance",
  authenticate,
  isAdmin,
  WalletController.adminGetUserWalletBalance
);

/**
 * @route GET /api/wallet/users/:userId/transactions
 * @desc Get user transaction history (admin only)
 * @access Admin
 */
router.get(
  "/users/:userId/transactions",
  authenticate,
  isAdmin,
  WalletController.adminGetUserTransactionHistory
);

/**
 * @route POST /api/wallet/topup/verify
 * @desc Verify wallet topup payment
 * @access Private
 */
router.post("/topup/verify", authenticate, WalletTopupController.verifyTopup);

/**
 * @route GET /api/wallet/topup/history
 * @desc Get wallet topup history
 * @access Private
 */
router.get(
  "/topup/history",
  authenticate,
  WalletTopupController.getTopupHistory
);

export default router;
