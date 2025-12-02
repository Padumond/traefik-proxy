import express from "express";
import { SenderIdController } from "../controllers/senderId.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { FileUploadService } from "../services/fileUpload.service";

const router = express.Router();

// Initialize file upload service
FileUploadService.init();

// Configure multer for file uploads
const upload = FileUploadService.getMulterConfig();

/**
 * @route POST /api/sender-ids
 * @desc Request a new sender ID with optional consent form upload
 * @access Private
 */
router.post(
  "/",
  authenticate,
  upload.single("consentForm"),
  SenderIdController.requestSenderId
);

/**
 * @route GET /api/sender-ids
 * @desc Get all sender IDs for a user
 * @access Private
 */
router.get("/", authenticate, SenderIdController.getSenderIds);

/**
 * @route GET /api/sender-ids/all
 * @desc Get all sender ID requests (admin only)
 * @access Admin
 */
router.get("/all", authenticate, isAdmin, SenderIdController.getAllSenderIds);

/**
 * @route PUT /api/sender-ids/:id/status
 * @desc Update sender ID status (admin only)
 * @access Admin
 */
router.put(
  "/:id/status",
  authenticate,
  isAdmin,
  SenderIdController.updateSenderIdStatus
);

/**
 * @route PUT /api/sender-ids/:id
 * @desc Update sender ID details (user)
 * @access Private
 */
router.put("/:id", authenticate, SenderIdController.updateSenderId);

/**
 * @route DELETE /api/sender-ids/:id
 * @desc Delete sender ID
 * @access Private
 */
router.delete("/:id", authenticate, SenderIdController.deleteSenderId);

/**
 * @route GET /api/sender-ids/pending
 * @desc Get all pending sender ID requests (admin only)
 * @access Admin
 */
router.get(
  "/pending",
  authenticate,
  isAdmin,
  SenderIdController.getPendingSenderIdRequests
);

/**
 * @route POST /api/sender-ids/:id/approve
 * @desc Approve sender ID request (admin only)
 * @access Admin
 */
router.post(
  "/:id/approve",
  authenticate,
  isAdmin,
  SenderIdController.approveSenderIdRequest
);

/**
 * @route POST /api/sender-ids/:id/reject
 * @desc Reject sender ID request (admin only)
 * @access Admin
 */
router.post(
  "/:id/reject",
  authenticate,
  isAdmin,
  SenderIdController.rejectSenderIdRequest
);

export default router;
