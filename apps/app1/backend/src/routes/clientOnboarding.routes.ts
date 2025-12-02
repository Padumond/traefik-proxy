import { Router } from "express";
import { ClientOnboardingController } from "../controllers/clientOnboarding.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
const expressValidator = require("express-validator");
const { body, param } = expressValidator;

const router = Router();

// Validation schemas
const registerClientValidation = [
  body("companyName")
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Company name must be between 2 and 100 characters"),
  body("contactName")
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Contact name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email address is required"),
  body("phone")
    .isString()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage("Valid phone number is required"),
  body("website")
    .optional()
    .isURL()
    .withMessage("Valid website URL is required"),
  body("businessType")
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Business type is required"),
  body("expectedVolume")
    .isString()
    .trim()
    .isIn(["1-1000", "1000-10000", "10000-100000", "100000+"])
    .withMessage("Valid expected volume is required"),
  body("useCase")
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Use case description must be between 10 and 500 characters"),
  body("password")
    .isString()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
];

const verifyEmailValidation = [
  param("token")
    .isString()
    .isLength({ min: 32, max: 128 })
    .withMessage("Valid verification token is required"),
];

const processApprovalValidation = [
  param("clientId").isUUID().withMessage("Valid client ID is required"),
  body("approved").isBoolean().withMessage("Approval status must be specified"),
  body("rejectionReason")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Rejection reason must be between 10 and 500 characters"),
  body("initialCredits")
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage("Initial credits must be between 0 and 10000"),
  body("tier")
    .optional()
    .isIn(["FREE", "BASIC", "PREMIUM", "ENTERPRISE"])
    .withMessage("Invalid tier specified"),
];

const updateProfileValidation = [
  body("companyName")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Company name must be between 2 and 100 characters"),
  body("phone")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage("Valid phone number is required"),
  body("website")
    .optional()
    .isURL()
    .withMessage("Valid website URL is required"),
  body("businessType")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Business type must be between 2 and 50 characters"),
  body("expectedVolume")
    .optional()
    .isString()
    .trim()
    .isIn(["1-1000", "1000-10000", "10000-100000", "100000+"])
    .withMessage("Valid expected volume is required"),
  body("useCase")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Use case description must be between 10 and 500 characters"),
];

const resendEmailValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email address is required"),
];

/**
 * @route POST /api/onboarding/register
 * @desc Register a new client
 * @access Public
 */
router.post(
  "/register",
  registerClientValidation,
  validateRequest,
  ClientOnboardingController.registerClient
);

/**
 * @route GET /api/onboarding/verify/:token
 * @desc Verify client email address
 * @access Public
 */
router.get(
  "/verify/:token",
  verifyEmailValidation,
  validateRequest,
  ClientOnboardingController.verifyEmail
);

/**
 * @route POST /api/onboarding/resend-verification
 * @desc Resend verification email
 * @access Public
 */
router.post(
  "/resend-verification",
  resendEmailValidation,
  validateRequest,
  ClientOnboardingController.resendVerificationEmail
);

/**
 * @route GET /api/onboarding/status
 * @desc Get onboarding status for current user
 * @access Private (Client)
 */
router.get(
  "/status",
  authenticate,
  ClientOnboardingController.getOnboardingStatus
);

/**
 * @route GET /api/onboarding/checklist
 * @desc Get onboarding checklist for current user
 * @access Private (Client)
 */
router.get(
  "/checklist",
  authenticate,
  ClientOnboardingController.getOnboardingChecklist
);

/**
 * @route PUT /api/onboarding/profile
 * @desc Update client profile during onboarding
 * @access Private (Client)
 */
router.put(
  "/profile",
  authenticate,
  updateProfileValidation,
  validateRequest,
  ClientOnboardingController.updateProfile
);

/**
 * @route POST /api/onboarding/complete-setup
 * @desc Complete client setup
 * @access Private (Client)
 */
router.post(
  "/complete-setup",
  authenticate,
  ClientOnboardingController.completeSetup
);

/**
 * @route GET /api/onboarding/admin/pending
 * @desc Get pending client approvals
 * @access Private (Admin)
 */
router.get(
  "/admin/pending",
  authenticate,
  ClientOnboardingController.getPendingApprovals
);

/**
 * @route POST /api/onboarding/admin/approve/:clientId
 * @desc Approve or reject a client
 * @access Private (Admin)
 */
router.post(
  "/admin/approve/:clientId",
  authenticate,
  processApprovalValidation,
  validateRequest,
  ClientOnboardingController.processClientApproval
);

/**
 * @route GET /api/onboarding/admin/stats
 * @desc Get onboarding statistics
 * @access Private (Admin)
 */
router.get(
  "/admin/stats",
  authenticate,
  ClientOnboardingController.getOnboardingStats
);

export default router;
