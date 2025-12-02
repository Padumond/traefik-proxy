import { PrismaClient, User, UserRole } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";
import {
  generateToken,
  hashPassword,
  comparePassword,
  generateApiKey,
  isValidEmail,
  isStrongPassword,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from "../utils/auth.utils";
import { UploadService } from "./upload.service";

const prisma = new PrismaClient();

interface RegisterUserParams {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

interface LoginParams {
  email: string;
  password: string;
}

export class UserService {
  /**
   * Register a new user
   */
  static async register({
    name,
    email,
    password,
    role = "CLIENT",
  }: RegisterUserParams): Promise<{
    user: Omit<User, "password">;
    token: string;
    refreshToken: string;
    refreshTokenExpiresAt: Date;
  }> {
    try {
      console.log("🔧 UserService.register called with:", {
        name,
        email,
        role,
      });

      // Validate email
      console.log("📧 Validating email:", email);
      if (!isValidEmail(email)) {
        console.log("❌ Email validation failed");
        throw ApiError.badRequest("Invalid email format");
      }
      console.log("✅ Email validation passed");

      // Validate password strength
      console.log("🔒 Validating password strength");
      if (!isStrongPassword(password)) {
        console.log("❌ Password strength validation failed");
        throw ApiError.badRequest(
          "Password must be at least 8 characters and contain uppercase, lowercase, number and special character"
        );
      }
      console.log("✅ Password strength validation passed");

      // Check if user already exists
      console.log("👤 Checking if user already exists");
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        console.log("❌ User already exists with this email");
        throw ApiError.conflict("Email already in use");
      }
      console.log("✅ Email is available");

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Generate API key for client users
      const apiKey = role === "CLIENT" ? generateApiKey() : null;

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          apiKey,
          walletBalance: 0,
        },
      });

      // Generate JWT
      const token = generateToken(user.id);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      // Generate refresh token
      const refreshTokenRaw = generateRefreshToken();
      const refreshTokenHash = await hashRefreshToken(refreshTokenRaw);
      const refreshTokenExpiresAt = getRefreshTokenExpiry();
      await prisma.refreshToken.create({
        data: {
          token: refreshTokenHash,
          userId: user.id,
          expiresAt: refreshTokenExpiresAt,
        },
      });

      return {
        user: userWithoutPassword,
        token,
        refreshToken: refreshTokenRaw,
        refreshTokenExpiresAt,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("User Service Error:", error);
      throw ApiError.internal("Failed to register user");
    }
  }

  /**
   * Login a user
   */
  static async login({ email, password }: LoginParams): Promise<{
    user: Omit<User, "password">;
    token: string;
    refreshToken: string;
    refreshTokenExpiresAt: Date;
  }> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw ApiError.unauthorized("Invalid credentials");
      }

      // Compare passwords
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        throw ApiError.unauthorized("Invalid credentials");
      }

      // Generate JWT
      const token = generateToken(user.id);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      // Generate refresh token
      const refreshTokenRaw = generateRefreshToken();
      const refreshTokenHash = await hashRefreshToken(refreshTokenRaw);
      const refreshTokenExpiresAt = getRefreshTokenExpiry();
      await prisma.refreshToken.create({
        data: {
          token: refreshTokenHash,
          userId: user.id,
          expiresAt: refreshTokenExpiresAt,
        },
      });

      return {
        user: userWithoutPassword,
        token,
        refreshToken: refreshTokenRaw,
        refreshTokenExpiresAt,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("User Service Error:", error);
      throw ApiError.internal("Failed to authenticate user");
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<Omit<User, "password">> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw ApiError.notFound("User not found");
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      return userWithoutPassword;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("User Service Error:", error);
      throw ApiError.internal("Failed to get user");
    }
  }

  /**
   * Update user
   */
  static async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
    }
  ): Promise<Omit<User, "password">> {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw ApiError.notFound("User not found");
      }

      // Prepare update data
      const updateData: any = {};

      if (data.name) {
        updateData.name = data.name;
      }

      if (data.email) {
        // Validate email
        if (!isValidEmail(data.email)) {
          throw ApiError.badRequest("Invalid email format");
        }

        // Check if email already in use by another user
        const emailUser = await prisma.user.findUnique({
          where: { email: data.email },
        });

        if (emailUser && emailUser.id !== id) {
          throw ApiError.conflict("Email already in use");
        }

        updateData.email = data.email;
      }

      if (data.password) {
        // Validate password strength
        if (!isStrongPassword(data.password)) {
          throw ApiError.badRequest(
            "Password must be at least 8 characters and contain uppercase, lowercase, number and special character"
          );
        }

        // Hash password
        updateData.password = await hashPassword(data.password);
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;

      return userWithoutPassword;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("User Service Error:", error);
      throw ApiError.internal("Failed to update user");
    }
  }

  /**
   * Regenerate API key for a user
   */
  static async regenerateApiKey(id: string): Promise<{ apiKey: string }> {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw ApiError.notFound("User not found");
      }

      // Only clients can have API keys
      if (user.role !== "CLIENT") {
        throw ApiError.badRequest("Only client users can have API keys");
      }

      // Generate new API key
      const apiKey = generateApiKey();

      // Update user
      await prisma.user.update({
        where: { id },
        data: { apiKey },
      });

      return { apiKey };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("User Service Error:", error);
      throw ApiError.internal("Failed to regenerate API key");
    }
  }

  /**
   * Get all users (admin only)
   */
  static async getAllUsers(
    filters: {
      role?: UserRole;
      page?: number;
      limit?: number;
    } = {}
  ) {
    try {
      const { role, page = 1, limit = 10 } = filters;
      const skip = (page - 1) * limit;

      // Build where clause based on filters
      const where: any = {};

      if (role) {
        where.role = role;
      }

      // Get total count for pagination
      const totalCount = await prisma.user.count({ where });

      // Get users
      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          apiKey: true,
          walletBalance: true,
          smsCredits: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      });

      return {
        data: users,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      console.error("User Service Error:", error);
      throw ApiError.internal("Failed to get users");
    }
  }

  /**
   * Upload user avatar
   */
  static async uploadAvatar(
    userId: string,
    avatarBuffer: Buffer
  ): Promise<{ user: Omit<User, "password">; avatarUrl: string }> {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw ApiError.notFound("User not found");
      }

      // Delete old avatar if exists
      if (existingUser.avatar) {
        const oldPublicId = UploadService.extractPublicId(existingUser.avatar);
        if (oldPublicId) {
          await UploadService.deleteImage(oldPublicId);
        }
      }

      // Upload new avatar
      const uploadResult = await UploadService.uploadAvatar(
        avatarBuffer,
        userId
      );

      // Update user with new avatar URL
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { avatar: uploadResult.secure_url },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          apiKey: true,
          walletBalance: true,
          smsCredits: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        user: updatedUser,
        avatarUrl: uploadResult.secure_url,
      };
    } catch (error) {
      console.error("Avatar upload error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal("Failed to upload avatar");
    }
  }

  /**
   * Delete user avatar
   */
  static async deleteAvatar(userId: string): Promise<Omit<User, "password">> {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw ApiError.notFound("User not found");
      }

      // Delete avatar from Cloudinary if exists
      if (existingUser.avatar) {
        const publicId = UploadService.extractPublicId(existingUser.avatar);
        if (publicId) {
          await UploadService.deleteImage(publicId);
        }
      }

      // Update user to remove avatar
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { avatar: null },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          apiKey: true,
          walletBalance: true,
          smsCredits: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    } catch (error) {
      console.error("Avatar deletion error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal("Failed to delete avatar");
    }
  }

  /**
   * Get current user profile (including avatar)
   */
  static async getCurrentUser(userId: string): Promise<Omit<User, "password">> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          apiKey: true,
          walletBalance: true,
          smsCredits: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw ApiError.notFound("User not found");
      }

      return user;
    } catch (error) {
      console.error("Get current user error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal("Failed to get user profile");
    }
  }

  /**
   * Update current user profile
   */
  static async updateCurrentUser(
    userId: string,
    data: { name?: string; email?: string; password?: string }
  ): Promise<Omit<User, "password">> {
    try {
      const updateData: any = {};

      if (data.name) {
        updateData.name = data.name;
      }

      if (data.email) {
        // Check if email is already taken by another user
        const existingUser = await prisma.user.findFirst({
          where: {
            email: data.email,
            NOT: { id: userId },
          },
        });

        if (existingUser) {
          throw ApiError.badRequest("Email is already taken");
        }

        updateData.email = data.email;
      }

      if (data.password) {
        const hashedPassword = await hashPassword(data.password);
        updateData.password = hashedPassword;
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          apiKey: true,
          walletBalance: true,
          smsCredits: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      console.error("Update current user error:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal("Failed to update user profile");
    }
  }
}
