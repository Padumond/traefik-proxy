import { PrismaClient, SenderIdStatus } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";
import { EmailService } from "./email.service";
import { FileUploadService, UploadedFile } from "./fileUpload.service";

const prisma = new PrismaClient();

interface CreateSenderIdParams {
  userId: string;
  senderId: string;
  purpose?: string;
  sampleMessage?: string;
  consentForm?: UploadedFile;
  companyName?: string;
}

interface UpdateSenderIdParams {
  purpose?: string;
  sampleMessage?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
}

export class SenderIdService {
  /**
   * Request a new sender ID with manual approval workflow
   */
  static async requestSenderId({
    userId,
    senderId,
    purpose,
    sampleMessage,
    consentForm,
    companyName,
  }: CreateSenderIdParams) {
    try {
      // Comprehensive sender ID validation
      const validation = this.validateSenderIdFormat(senderId);
      if (!validation.valid) {
        throw ApiError.badRequest(
          validation.error || "Invalid sender ID format"
        );
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw ApiError.notFound("User not found");
      }

      // Check if this sender ID is already registered by this user
      const existingSenderId = await prisma.senderID.findFirst({
        where: {
          userId,
          senderId,
        },
      });

      if (existingSenderId) {
        throw ApiError.conflict("You have already requested this sender ID");
      }

      // Create sender ID request in database
      const senderIdRequest = await prisma.senderID.create({
        data: {
          userId,
          senderId,
          purpose: purpose || "",
          sampleMessage: sampleMessage || "",
          companyName: companyName || null,
          status: "PENDING",
          ...(consentForm && {
            consentFormPath: consentForm.path,
            consentFormOriginalName: consentForm.originalName,
            consentFormMimeType: consentForm.mimeType,
            consentFormSize: consentForm.size,
          }),
        },
        include: {
          user: {
            include: {
              clientProfile: true,
            },
          },
        },
      });

      // Send email notification to admins if consent form was uploaded
      if (consentForm) {
        try {
          await EmailService.sendSenderIdApprovalNotification({
            clientName: senderIdRequest.user.name,
            clientEmail: senderIdRequest.user.email,
            companyName: senderIdRequest.user.clientProfile?.companyName,
            senderId: senderIdRequest.senderId,
            purpose: senderIdRequest.purpose || undefined,
            sampleMessage: senderIdRequest.sampleMessage || undefined,
            consentFormPath: consentForm.path,
            consentFormOriginalName: consentForm.originalName,
            consentFormMimeType: consentForm.mimeType,
          });

          // Mark email notification as sent
          await prisma.senderID.update({
            where: { id: senderIdRequest.id },
            data: { emailNotificationSent: true },
          });
        } catch (error) {
          console.error("Failed to send email notification:", error);
          // Don't fail the request if email fails
        }
      }

      return senderIdRequest;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Sender ID Service Error:", error);
      throw ApiError.internal("Failed to request sender ID");
    }
  }

  /**
   * Get all sender IDs for a user
   */
  static async getSenderIds(
    userId: string,
    filters: {
      status?: SenderIdStatus;
      page?: number;
      limit?: number;
    } = {}
  ) {
    try {
      const { status, page = 1, limit = 10 } = filters;

      const skip = (page - 1) * limit;

      // Build where clause based on filters
      const where: any = { userId };

      if (status) {
        where.status = status;
      }

      // Get total count for pagination
      const totalCount = await prisma.senderID.count({ where });

      // Get sender IDs
      const senderIds = await prisma.senderID.findMany({
        where,
        orderBy: {
          submittedAt: "desc",
        },
        skip,
        take: limit,
      });

      return {
        data: senderIds,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      console.error("Sender ID Service Error:", error);
      throw ApiError.internal("Failed to get sender IDs");
    }
  }

  /**
   * Admin function to approve or reject a sender ID
   */
  static async updateSenderIdStatus(
    adminId: string,
    senderIdId: string,
    status: SenderIdStatus,
    adminNotes?: string
  ) {
    try {
      // Check if admin user exists and is actually an admin
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw ApiError.notFound("Admin user not found");
      }

      if (admin.role !== "ADMIN") {
        throw ApiError.forbidden("Only admins can perform this action");
      }

      // Check if sender ID exists
      const senderId = await prisma.senderID.findUnique({
        where: { id: senderIdId },
      });

      if (!senderId) {
        throw ApiError.notFound("Sender ID not found");
      }

      // Update sender ID status with appropriate timestamps
      const updateData: any = {
        status,
        approvedBy: adminId,
        adminNotes: adminNotes || null,
      };

      // Set appropriate timestamp based on status
      if (status === "APPROVED") {
        updateData.approvedAt = new Date();
        updateData.rejectedAt = null; // Clear rejected timestamp if previously rejected
      } else if (status === "REJECTED") {
        updateData.rejectedAt = new Date();
        updateData.approvedAt = null; // Clear approved timestamp if previously approved
      }

      const updatedSenderId = await prisma.senderID.update({
        where: { id: senderIdId },
        data: updateData,
      });

      return updatedSenderId;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Sender ID Service Error:", error);
      throw ApiError.internal("Failed to update sender ID status");
    }
  }

  /**
   * Admin function to get all sender ID requests
   */
  static async getAllSenderIds(
    adminId: string,
    filters: {
      status?: SenderIdStatus;
      userId?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    try {
      // Check if admin user exists and is actually an admin
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        throw ApiError.notFound("Admin user not found");
      }

      if (admin.role !== "ADMIN") {
        throw ApiError.forbidden("Only admins can perform this action");
      }

      const { status, userId, page = 1, limit = 10 } = filters;

      const skip = (page - 1) * limit;

      // Build where clause based on filters
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (userId) {
        where.userId = userId;
      }

      // Get total count for pagination
      const totalCount = await prisma.senderID.count({ where });

      // Get sender IDs with user info
      const senderIds = await prisma.senderID.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
        skip,
        take: limit,
      });

      return {
        data: senderIds,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Sender ID Service Error:", error);
      throw ApiError.internal("Failed to get sender IDs");
    }
  }

  /**
   * Create a new sender ID (for client API)
   */
  static async createSenderId({
    userId,
    senderId,
    purpose,
    sampleMessage,
  }: CreateSenderIdParams) {
    try {
      // Comprehensive sender ID validation
      const validation = this.validateSenderIdFormat(senderId);
      if (!validation.valid) {
        throw ApiError.badRequest(
          validation.error || "Invalid sender ID format"
        );
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw ApiError.notFound("User not found");
      }

      // Check if this sender ID is already registered by this user
      const existingSenderId = await prisma.senderID.findFirst({
        where: {
          userId,
          senderId,
        },
      });

      if (existingSenderId) {
        throw ApiError.conflict("You have already requested this sender ID");
      }

      // Create sender ID request
      const senderIdRequest = await prisma.senderID.create({
        data: {
          userId,
          senderId,
          purpose: purpose || "",
          sampleMessage: sampleMessage || "",
          status: "PENDING",
        },
      });

      return senderIdRequest;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Sender ID Service Error:", error);
      throw ApiError.internal("Failed to create sender ID");
    }
  }

  /**
   * Get sender ID by name for a user
   */
  static async getSenderIdByName(userId: string, senderId: string) {
    try {
      const senderIdRecord = await prisma.senderID.findFirst({
        where: {
          userId,
          senderId,
        },
      });

      return senderIdRecord;
    } catch (error) {
      console.error("Sender ID Service Error:", error);
      throw ApiError.internal("Failed to get sender ID");
    }
  }

  /**
   * Update sender ID
   */
  static async updateSenderId(
    userId: string,
    senderIdId: string,
    updates: UpdateSenderIdParams
  ) {
    try {
      // Check if sender ID exists and belongs to user
      const existingSenderId = await prisma.senderID.findFirst({
        where: {
          id: senderIdId,
          userId,
        },
      });

      if (!existingSenderId) {
        throw ApiError.notFound("Sender ID not found");
      }

      // Update sender ID
      const updatedSenderId = await prisma.senderID.update({
        where: { id: senderIdId },
        data: {
          ...updates,
          updatedAt: new Date(),
          ...(updates.status === "APPROVED" && { approvedAt: new Date() }),
          ...(updates.status === "REJECTED" && { rejectedAt: new Date() }),
        },
      });

      // Note: Manual approval workflow - no automatic sync to Arkessel

      return updatedSenderId;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Sender ID Service Error:", error);
      throw ApiError.internal("Failed to update sender ID");
    }
  }

  /**
   * Delete sender ID
   */
  static async deleteSenderId(userId: string, senderIdId: string) {
    try {
      // Check if sender ID exists and belongs to user
      const existingSenderId = await prisma.senderID.findFirst({
        where: {
          id: senderIdId,
          userId,
        },
      });

      if (!existingSenderId) {
        throw ApiError.notFound("Sender ID not found");
      }

      // Note: Arkessel deletion removed - using manual approval workflow

      // Delete from local database
      await prisma.senderID.delete({
        where: { id: senderIdId },
      });

      return { success: true, message: "Sender ID deleted successfully" };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Sender ID Service Error:", error);
      throw ApiError.internal("Failed to delete sender ID");
    }
  }

  /**
   * Approve sender ID request (Admin only)
   */
  static async approveSenderIdRequest(
    senderIdId: string,
    adminId: string,
    adminNotes?: string
  ) {
    try {
      const senderIdRecord = await prisma.senderID.findUnique({
        where: { id: senderIdId },
        include: { user: true },
      });

      if (!senderIdRecord) {
        throw ApiError.notFound("Sender ID request not found");
      }

      if (senderIdRecord.status !== "PENDING") {
        throw ApiError.badRequest("Sender ID request is not pending");
      }

      const updatedSenderId = await prisma.senderID.update({
        where: { id: senderIdId },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy: adminId,
          adminNotes: adminNotes || null,
        },
        include: { user: true, approver: true },
      });

      console.log(
        `Sender ID ${senderIdRecord.senderId} approved by admin ${adminId}`
      );
      return updatedSenderId;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Sender ID Service Error:", error);
      throw ApiError.internal("Failed to approve sender ID request");
    }
  }

  /**
   * Reject sender ID request (Admin only)
   */
  static async rejectSenderIdRequest(
    senderIdId: string,
    adminId: string,
    rejectionReason: string,
    adminNotes?: string
  ) {
    try {
      const senderIdRecord = await prisma.senderID.findUnique({
        where: { id: senderIdId },
        include: { user: true },
      });

      if (!senderIdRecord) {
        throw ApiError.notFound("Sender ID request not found");
      }

      if (senderIdRecord.status !== "PENDING") {
        throw ApiError.badRequest("Sender ID request is not pending");
      }

      const updatedSenderId = await prisma.senderID.update({
        where: { id: senderIdId },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectionReason,
          approvedBy: adminId,
          adminNotes: adminNotes || null,
        },
        include: { user: true, approver: true },
      });

      console.log(
        `Sender ID ${senderIdRecord.senderId} rejected by admin ${adminId}`
      );
      return updatedSenderId;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Sender ID Service Error:", error);
      throw ApiError.internal("Failed to reject sender ID request");
    }
  }

  /**
   * Get all pending sender ID requests (Admin only)
   */
  static async getPendingSenderIdRequests() {
    try {
      const pendingRequests = await prisma.senderID.findMany({
        where: { status: "PENDING" },
        include: {
          user: {
            include: {
              clientProfile: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });

      return pendingRequests;
    } catch (error) {
      console.error("Sender ID Service Error:", error);
      throw ApiError.internal("Failed to get pending sender ID requests");
    }
  }

  // Restricted keywords/abbreviations that identify other institutions
  private static restrictedKeywords = [
    "BANK",
    "GOVT",
    "GOV",
    "GHS",
    "NHIS",
    "GRA",
    "ECG",
    "GWCL",
    "NCA",
    "BOG",
    "MTN",
    "VODAFONE",
    "TIGO",
    "AIRTEL",
    "GLO",
    "POLICE",
    "ARMY",
    "NAVY",
    "CUSTOMS",
    "IMMIGRATION",
    "PARLIAMENT",
    "JUDICIARY",
    "CHRAJ",
    "EOCO",
    "BNI",
    "FDA",
    "EPA",
    "COCOBOD",
    "SSNIT",
    "NHIA",
    "NLA",
    "GPHA",
    "GCAA",
    "DVLA",
    "GNPC",
    "VRA",
    "GRIDCO",
    "BOST",
    "TOR",
    "GACL",
    "GSA",
    "CEPS",
    "IRS",
  ];

  /**
   * Check if sender ID contains restricted keywords
   */
  private static containsRestrictedKeyword(senderId: string): string | null {
    const upperSenderId = senderId.toUpperCase();
    for (const keyword of this.restrictedKeywords) {
      if (upperSenderId.includes(keyword) || upperSenderId === keyword) {
        return keyword;
      }
    }
    return null;
  }

  /**
   * Check if sender ID is purely numeric
   */
  private static isNumericOnly(senderId: string): boolean {
    return /^\d+$/.test(senderId);
  }

  /**
   * Validate sender ID format
   * Sender ID must be alphanumeric and between 3-11 characters
   */
  private static isValidSenderId(senderId: string): boolean {
    const senderIdRegex = /^[a-zA-Z0-9]{3,11}$/;
    return senderIdRegex.test(senderId);
  }

  /**
   * Comprehensive sender ID validation with detailed error messages
   */
  static validateSenderIdFormat(senderId: string): {
    valid: boolean;
    error?: string;
  } {
    // Check basic format
    if (!senderId || !senderId.trim()) {
      return { valid: false, error: "Sender ID is required" };
    }

    // Check alphanumeric
    if (!/^[a-zA-Z0-9]+$/.test(senderId)) {
      return {
        valid: false,
        error: "Sender ID must contain only letters and numbers",
      };
    }

    // Check length
    if (senderId.length < 3) {
      return {
        valid: false,
        error: "Sender ID should not be less than 3 characters",
      };
    }

    if (senderId.length > 11) {
      return {
        valid: false,
        error: "Sender ID should not exceed 11 characters",
      };
    }

    // Check if purely numeric
    if (this.isNumericOnly(senderId)) {
      return { valid: false, error: "Sender ID should not be purely numeric" };
    }

    // Check for restricted keywords
    const restrictedKeyword = this.containsRestrictedKeyword(senderId);
    if (restrictedKeyword) {
      return {
        valid: false,
        error: `Avoid using keywords or abbreviations that identify other institutions (detected: ${restrictedKeyword})`,
      };
    }

    return { valid: true };
  }
}
