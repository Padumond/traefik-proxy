import express from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { uploadAvatar } from "../middleware/upload.middleware";

const router = express.Router();

/**
 * @route GET /api/users/me
 * @desc Get current user profile
 * @access Private
 */
router.get("/me", authenticate, UserController.getCurrentUser);

/**
 * @route GET /api/users/profile
 * @desc Get current user profile (alternative endpoint)
 * @access Private
 */
router.get("/profile", authenticate, UserController.getCurrentUser);

/**
 * @route PUT /api/users/profile
 * @desc Update current user profile
 * @access Private
 */
router.put("/profile", authenticate, UserController.updateCurrentUser);

/**
 * @route GET /api/users
 * @desc Get all users (admin only)
 * @access Admin
 */
router.get("/", authenticate, isAdmin, UserController.getAllUsers);

/**
 * @route GET /api/users/:id
 * @desc Get user by ID (admin only)
 * @access Admin
 */
router.get("/:id", authenticate, isAdmin, UserController.getUserById);

/**
 * @route PUT /api/users/:id
 * @desc Update user (admin only)
 * @access Admin
 */
router.put("/:id", authenticate, isAdmin, UserController.updateUser);

/**
 * @route POST /api/users/:id/regenerate-api-key
 * @desc Regenerate user API key (admin only)
 * @access Admin
 */
router.post(
  "/:id/regenerate-api-key",
  authenticate,
  isAdmin,
  UserController.regenerateUserApiKey
);

/**
 * @route POST /api/users/avatar
 * @desc Upload user avatar
 * @access Private
 */
router.post("/avatar", authenticate, uploadAvatar, UserController.uploadAvatar);

/**
 * @route DELETE /api/users/avatar
 * @desc Delete user avatar
 * @access Private
 */
router.delete("/avatar", authenticate, UserController.deleteAvatar);

export default router;
