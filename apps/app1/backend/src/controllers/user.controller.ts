import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";
import { ApiError } from "../middleware/error.middleware";
import { UserRole } from "@prisma/client";
import { AuthenticatedRequest } from "../types/auth.types";

export class UserController {
  /**
   * Get all users (admin only)
   */
  static async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      // Ensure user is admin
      if ((req as AuthenticatedRequest).user?.role !== "ADMIN") {
        throw ApiError.forbidden("Admin access required");
      }

      const { role, page, limit } = req.query;

      const result = await UserService.getAllUsers({
        role: role as UserRole,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID (admin only)
   */
  static async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      // Ensure user is admin
      if ((req as AuthenticatedRequest).user?.role !== "ADMIN") {
        throw ApiError.forbidden("Admin access required");
      }

      const { id } = req.params;

      const user = await UserService.getUserById(id);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user (admin only)
   */
  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      // Ensure user is admin
      if ((req as AuthenticatedRequest).user?.role !== "ADMIN") {
        throw ApiError.forbidden("Admin access required");
      }

      const { id } = req.params;
      const { name, email, password } = req.body;

      // Ensure at least one field is provided
      if (!name && !email && !password) {
        throw ApiError.badRequest("At least one field must be provided");
      }

      const updatedUser = await UserService.updateUser(id, {
        name,
        email,
        password,
      });

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Regenerate user API key (admin only)
   */
  static async regenerateUserApiKey(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Ensure user is admin
      if ((req as AuthenticatedRequest).user?.role !== "ADMIN") {
        throw ApiError.forbidden("Admin access required");
      }

      const { id } = req.params;

      const result = await UserService.regenerateApiKey(id);

      res.status(200).json({
        success: true,
        message: "API key regenerated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;

      if (!userId) {
        throw ApiError.unauthorized("User not authenticated");
      }

      const user = await UserService.getCurrentUser(userId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user profile
   */
  static async updateCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;

      if (!userId) {
        throw ApiError.unauthorized("User not authenticated");
      }

      const { name, email, password } = req.body;

      const user = await UserService.updateCurrentUser(userId, {
        name,
        email,
        password,
      });

      res.status(200).json({
        success: true,
        data: user,
        message: "Profile updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload user avatar
   */
  static async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;

      if (!userId) {
        throw ApiError.unauthorized("User not authenticated");
      }

      if (!req.file) {
        throw ApiError.badRequest("No file uploaded");
      }

      const result = await UserService.uploadAvatar(userId, req.file.buffer);

      res.status(200).json({
        success: true,
        message: "Avatar uploaded successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user avatar
   */
  static async deleteAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;

      if (!userId) {
        throw ApiError.unauthorized("User not authenticated");
      }

      const user = await UserService.deleteAvatar(userId);

      res.status(200).json({
        success: true,
        message: "Avatar deleted successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}
