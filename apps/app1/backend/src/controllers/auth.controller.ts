import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";
import { ApiError } from "../middleware/error.middleware";
import { UserRole } from "@prisma/client";

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("🚀 Registration request received");
      console.log("📝 Request body:", req.body);

      const { name, email, password, role } = req.body;

      console.log("🔍 Extracted fields:", {
        name,
        email,
        password: password ? "[HIDDEN]" : undefined,
        role,
      });

      // Validate request body
      if (!name || !email || !password) {
        console.log("❌ Validation failed: missing required fields");
        throw ApiError.badRequest("Name, email, and password are required");
      }

      // Only admins can create admin users
      if (role === "ADMIN") {
        const authUser = req.user;
        if (!authUser || authUser.role !== "ADMIN") {
          throw ApiError.forbidden("Only admins can create admin users");
        }
      }

      const result = await UserService.register({
        name,
        email,
        password,
        role: role as UserRole,
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login a user
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // Validate request body
      if (!email || !password) {
        throw ApiError.badRequest("Email and password are required");
      }

      const result = await UserService.login({
        email,
        password,
      });

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const user = await UserService.getUserById(userId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Regenerate API key
   */
  static async regenerateApiKey(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const result = await UserService.regenerateApiKey(userId);

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
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { name, email, password } = req.body;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      // Ensure at least one field is provided
      if (!name && !email && !password) {
        throw ApiError.badRequest("At least one field must be provided");
      }

      const updatedUser = await UserService.updateUser(userId, {
        name,
        email,
        password,
      });

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }
}
