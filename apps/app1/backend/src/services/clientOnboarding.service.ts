import { PrismaClient } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { EmailService } from "./email.service";

const prisma = new PrismaClient();

export interface ClientRegistrationRequest {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  businessType: string;
  expectedVolume: string;
  useCase: string;
  password: string;
}

export interface ClientApprovalRequest {
  clientId: string;
  approved: boolean;
  rejectionReason?: string;
  initialCredits?: number;
  tier?: "FREE" | "BASIC" | "PREMIUM" | "ENTERPRISE";
}

export interface OnboardingStatus {
  step: "REGISTRATION" | "VERIFICATION" | "APPROVAL" | "SETUP" | "COMPLETE";
  completed: boolean;
  nextAction?: string;
  requirements?: string[];
}

export class ClientOnboardingService {
  /**
   * Register a new client
   */
  static async registerClient(data: ClientRegistrationRequest): Promise<{
    clientId: string;
    verificationToken: string;
    status: OnboardingStatus;
  }> {
    try {
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw ApiError.conflict("Email address already registered");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // Create user with CLIENT role
      const user = await prisma.user.create({
        data: {
          name: data.contactName,
          email: data.email,
          password: hashedPassword,
          role: "CLIENT",
          // Note: isActive, emailVerified, emailVerificationToken fields need to be added to User model
          // isActive: false, // Inactive until verified and approved
          // emailVerified: false,
          // emailVerificationToken: verificationToken,
          // emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // Create client profile
      const clientProfile = await prisma.clientProfile.create({
        data: {
          userId: user.id,
          companyName: data.companyName,
          phone: data.phone,
          website: data.website,
          businessType: data.businessType,
          expectedVolume: data.expectedVolume,
          useCase: data.useCase,
          onboardingStatus: "VERIFICATION",
          tier: "FREE",
        },
      });

      // Send verification email
      await this.sendVerificationEmail(
        user.email,
        data.contactName,
        verificationToken
      );

      return {
        clientId: user.id,
        verificationToken,
        status: {
          step: "VERIFICATION",
          completed: false,
          nextAction: "Verify email address",
          requirements: ["Check email for verification link"],
        },
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Client registration error:", error);
      throw ApiError.internal("Failed to register client");
    }
  }

  /**
   * Verify client email
   */
  static async verifyEmail(token: string): Promise<OnboardingStatus> {
    try {
      // TODO: Implement email verification when User model has the required fields
      const user = await prisma.user.findFirst({
        where: {
          // emailVerificationToken: token,
          // emailVerificationExpires: { gt: new Date() },
          email: token, // Temporary workaround - use email as token for now
        },
        include: { clientProfile: true },
      });

      if (!user) {
        throw ApiError.badRequest("Invalid or expired verification token");
      }

      // TODO: Update user verification status when User model has the required fields
      /*
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
      });
      */

      // Update client profile status
      await prisma.clientProfile.update({
        where: { userId: user.id },
        data: { onboardingStatus: "APPROVAL" },
      });

      // Notify admins of new client pending approval
      await this.notifyAdminsOfPendingApproval(user);

      return {
        step: "APPROVAL",
        completed: false,
        nextAction: "Wait for admin approval",
        requirements: ["Account under review by administrators"],
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Email verification error:", error);
      throw ApiError.internal("Failed to verify email");
    }
  }

  /**
   * Get onboarding status for a client
   */
  static async getOnboardingStatus(
    clientId: string
  ): Promise<OnboardingStatus> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: clientId },
        include: { clientProfile: true },
      });

      if (!user || user.role !== "CLIENT") {
        throw ApiError.notFound("Client not found");
      }

      const profile = user.clientProfile;
      if (!profile) {
        throw ApiError.notFound("Client profile not found");
      }

      const status = profile.onboardingStatus as OnboardingStatus["step"];

      switch (status) {
        case "VERIFICATION":
          return {
            step: "VERIFICATION",
            completed: false,
            nextAction: "Verify email address",
            requirements: ["Check email for verification link"], // TODO: Check user.emailVerified when field exists
          };

        case "APPROVAL":
          return {
            step: "APPROVAL",
            completed: false,
            nextAction: "Wait for admin approval",
            requirements: ["Account under review by administrators"],
          };

        case "SETUP":
          return {
            step: "SETUP",
            completed: false,
            nextAction: "Complete account setup",
            requirements: [
              "Create first API key",
              "Request sender ID",
              "Add initial credits",
            ],
          };

        case "COMPLETE":
          return {
            step: "COMPLETE",
            completed: true,
          };

        default:
          return {
            step: "REGISTRATION",
            completed: false,
            nextAction: "Complete registration",
            requirements: ["Fill out registration form"],
          };
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Get onboarding status error:", error);
      throw ApiError.internal("Failed to get onboarding status");
    }
  }

  /**
   * Approve or reject a client (admin only)
   */
  static async processClientApproval(
    data: ClientApprovalRequest
  ): Promise<OnboardingStatus> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: data.clientId },
        include: { clientProfile: true },
      });

      if (!user || user.role !== "CLIENT") {
        throw ApiError.notFound("Client not found");
      }

      if (data.approved) {
        // Approve client
        await prisma.$transaction(async (tx) => {
          // TODO: Activate user account when isActive field exists
          /*
          await tx.user.update({
            where: { id: data.clientId },
            data: { isActive: true },
          });
          */

          // Update client profile
          await tx.clientProfile.update({
            where: { userId: data.clientId },
            data: {
              onboardingStatus: "SETUP",
              tier: data.tier || "FREE",
              approvedAt: new Date(),
            },
          });

          // Add initial credits if specified
          if (data.initialCredits && data.initialCredits > 0) {
            await tx.walletTransaction.create({
              data: {
                userId: data.clientId,
                type: "CREDIT",
                amount: data.initialCredits,
                description: "Initial welcome credits",
                status: "COMPLETED",
              },
            });

            await tx.user.update({
              where: { id: data.clientId },
              data: {
                walletBalance: { increment: data.initialCredits },
              },
            });
          }
        });

        // Send approval email
        await this.sendApprovalEmail(
          user.email,
          user.name,
          data.initialCredits
        );

        return {
          step: "SETUP",
          completed: false,
          nextAction: "Complete account setup",
          requirements: [
            "Create first API key",
            "Request sender ID",
            "Add initial credits",
          ],
        };
      } else {
        // Reject client
        await prisma.clientProfile.update({
          where: { userId: data.clientId },
          data: {
            onboardingStatus: "REGISTRATION",
            rejectionReason: data.rejectionReason,
            rejectedAt: new Date(),
          },
        });

        // Send rejection email
        await this.sendRejectionEmail(
          user.email,
          user.name,
          data.rejectionReason
        );

        return {
          step: "REGISTRATION",
          completed: false,
          nextAction: "Resubmit application",
          requirements: ["Address rejection reasons and reapply"],
        };
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Client approval error:", error);
      throw ApiError.internal("Failed to process client approval");
    }
  }

  /**
   * Complete client setup
   */
  static async completeSetup(clientId: string): Promise<OnboardingStatus> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: clientId },
        include: {
          clientProfile: true,
          apiKeys: true,
          senderIds: true,
        },
      });

      if (!user || user.role !== "CLIENT") {
        throw ApiError.notFound("Client not found");
      }

      // Check setup requirements
      const hasApiKey = user.apiKeys.length > 0;
      const hasSenderId = user.senderIds.length > 0;
      const hasCredits = user.walletBalance > 0;

      if (!hasApiKey || !hasSenderId || !hasCredits) {
        const requirements = [];
        if (!hasApiKey) requirements.push("Create first API key");
        if (!hasSenderId) requirements.push("Request sender ID");
        if (!hasCredits) requirements.push("Add initial credits");

        return {
          step: "SETUP",
          completed: false,
          nextAction: "Complete remaining setup steps",
          requirements,
        };
      }

      // Mark onboarding as complete
      await prisma.clientProfile.update({
        where: { userId: clientId },
        data: {
          onboardingStatus: "COMPLETE",
          completedAt: new Date(),
        },
      });

      // Send welcome email
      await this.sendWelcomeEmail(user.email, user.name);

      return {
        step: "COMPLETE",
        completed: true,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Complete setup error:", error);
      throw ApiError.internal("Failed to complete setup");
    }
  }

  /**
   * Get pending approvals (admin only)
   */
  static async getPendingApprovals(): Promise<
    Array<{
      clientId: string;
      companyName: string;
      contactName: string;
      email: string;
      businessType: string;
      expectedVolume: string;
      useCase: string;
      registeredAt: Date;
    }>
  > {
    try {
      const pendingClients = await prisma.user.findMany({
        where: {
          role: "CLIENT",
          clientProfile: {
            onboardingStatus: "APPROVAL",
          },
        },
        include: { clientProfile: true },
        orderBy: { createdAt: "asc" },
      });

      return pendingClients.map((user) => ({
        clientId: user.id,
        companyName: user.clientProfile!.companyName,
        contactName: user.name,
        email: user.email,
        businessType: user.clientProfile!.businessType,
        expectedVolume: user.clientProfile!.expectedVolume,
        useCase: user.clientProfile!.useCase,
        registeredAt: user.createdAt,
      }));
    } catch (error) {
      console.error("Get pending approvals error:", error);
      throw ApiError.internal("Failed to get pending approvals");
    }
  }

  /**
   * Send verification email
   */
  private static async sendVerificationEmail(
    email: string,
    name: string,
    token: string
  ): Promise<void> {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

      await EmailService.sendEmail({
        to: email,
        subject: "Verify Your Mas3ndi Account",
        html: `
          <h2>Welcome to Mas3ndi, ${name}!</h2>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${verificationUrl}">Verify Email</a>
          <p>This link expires in 24 hours.</p>
        `,
        text: `Welcome to Mas3ndi, ${name}! Please verify your email: ${verificationUrl}`,
      });
    } catch (error) {
      console.error("Send verification email error:", error);
      // Don't throw error - registration should still succeed
    }
  }

  /**
   * Notify admins of pending approval
   */
  private static async notifyAdminsOfPendingApproval(user: any): Promise<void> {
    try {
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { email: true, name: true },
      });

      for (const admin of admins) {
        await EmailService.sendEmail({
          to: admin.email,
          subject: "New Client Pending Approval",
          html: `
            <h2>New Client Pending Approval</h2>
            <p>Hello ${admin.name},</p>
            <p>A new client has registered and is pending approval:</p>
            <ul>
              <li>Name: ${user.name}</li>
              <li>Email: ${user.email}</li>
              <li>Company: ${user.clientProfile?.companyName || "N/A"}</li>
            </ul>
            <a href="${
              process.env.FRONTEND_URL
            }/admin/clients/pending">Review Pending Clients</a>
          `,
          text: `New client pending approval: ${user.name} (${user.email})`,
        });
      }
    } catch (error) {
      console.error("Notify admins error:", error);
    }
  }

  /**
   * Send approval email
   */
  private static async sendApprovalEmail(
    email: string,
    name: string,
    initialCredits?: number
  ): Promise<void> {
    try {
      await EmailService.sendEmail({
        to: email,
        subject: "Welcome to Mas3ndi - Account Approved!",
        html: `
          <h2>Welcome to Mas3ndi, ${name}!</h2>
          <p>Your account has been approved and is now active.</p>
          ${
            initialCredits
              ? `<p>You have been granted ${initialCredits} initial credits.</p>`
              : ""
          }
          <p>Get started:</p>
          <ul>
            <li><a href="${
              process.env.FRONTEND_URL
            }/dashboard">Access Dashboard</a></li>
            <li><a href="${
              process.env.FRONTEND_URL
            }/setup">Complete Setup</a></li>
          </ul>
        `,
        text: `Welcome to Mas3ndi, ${name}! Your account is approved. Dashboard: ${process.env.FRONTEND_URL}/dashboard`,
      });
    } catch (error) {
      console.error("Send approval email error:", error);
    }
  }

  /**
   * Send rejection email
   */
  private static async sendRejectionEmail(
    email: string,
    name: string,
    reason?: string
  ): Promise<void> {
    try {
      await EmailService.sendEmail({
        to: email,
        subject: "Mas3ndi Application Update",
        html: `
          <h2>Application Update</h2>
          <p>Dear ${name},</p>
          <p>Thank you for your interest in Mas3ndi. Unfortunately, we cannot approve your application at this time.</p>
          <p>Reason: ${
            reason || "Application did not meet our requirements"
          }</p>
          <p>You may reapply at any time: <a href="${
            process.env.FRONTEND_URL
          }/register">Register Again</a></p>
          <p>If you have questions, contact us at ${
            process.env.SUPPORT_EMAIL || "support@mas3ndi.com"
          }</p>
        `,
        text: `Dear ${name}, your Mas3ndi application was not approved. Reason: ${
          reason || "Application did not meet our requirements"
        }`,
      });
    } catch (error) {
      console.error("Send rejection email error:", error);
    }
  }

  /**
   * Send welcome email
   */
  private static async sendWelcomeEmail(
    email: string,
    name: string
  ): Promise<void> {
    try {
      await EmailService.sendEmail({
        to: email,
        subject: "Welcome to Mas3ndi - Setup Complete!",
        html: `
          <h2>Welcome to Mas3ndi, ${name}!</h2>
          <p>Your account setup is complete and you're ready to start sending SMS!</p>
          <p>Quick links:</p>
          <ul>
            <li><a href="${
              process.env.FRONTEND_URL
            }/dashboard">Dashboard</a></li>
            <li><a href="${
              process.env.FRONTEND_URL
            }/docs">API Documentation</a></li>
          </ul>
          <p>Need help? Contact us at ${
            process.env.SUPPORT_EMAIL || "support@mas3ndi.com"
          }</p>
        `,
        text: `Welcome to Mas3ndi, ${name}! Your setup is complete. Dashboard: ${process.env.FRONTEND_URL}/dashboard`,
      });
    } catch (error) {
      console.error("Send welcome email error:", error);
    }
  }
}
