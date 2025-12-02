import { Request, Response, NextFunction } from "express";
import { SenderIdService } from "../services/senderId.service";
import { ApiError } from "../middleware/error.middleware";
import { FileUploadService } from "../services/fileUpload.service";
import { SenderIdStatus } from "@prisma/client";

export class SenderIdController {
  /**
   * Request a new sender ID with consent form upload
   */
  static async requestSenderId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const { senderId, purpose, sampleMessage, companyName } = req.body;
      const file = req.file;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      if (!senderId) {
        throw ApiError.badRequest("Sender ID is required");
      }

      if (!purpose) {
        throw ApiError.badRequest("Purpose is required");
      }

      if (purpose.length < 50) {
        throw ApiError.badRequest("Purpose must be at least 50 characters");
      }

      // Process uploaded consent form if provided
      let consentForm;
      if (file) {
        try {
          consentForm = FileUploadService.processUploadedFile(file);
        } catch (error) {
          // Clean up uploaded file if processing fails
          await FileUploadService.deleteFile(file.path);
          throw error;
        }
      }

      // Generate a sample message if not provided
      const finalSampleMessage =
        sampleMessage ||
        `Sample message from ${
          companyName || senderId
        }. This is an example of the type of messages that will be sent using this sender ID.`;

      const result = await SenderIdService.requestSenderId({
        userId,
        senderId,
        purpose,
        sampleMessage: finalSampleMessage,
        consentForm,
        companyName,
      });

      res.status(201).json({
        success: true,
        message: consentForm
          ? "Sender ID requested successfully. Consent form uploaded and notification sent to administrators."
          : "Sender ID requested successfully. Please upload a consent form to complete the approval process.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all sender IDs for a user
   */
  static async getSenderIds(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { status, page, limit } = req.query;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const result = await SenderIdService.getSenderIds(userId, {
        status: status as SenderIdStatus,
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
   * Admin: Get all sender ID requests
   */
  static async getAllSenderIds(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const adminId = req.user?.id;
      const { status, userId, page, limit } = req.query;

      if (!adminId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const result = await SenderIdService.getAllSenderIds(adminId, {
        status: status as SenderIdStatus,
        userId: userId as string,
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
   * Admin: Update sender ID status
   */
  static async updateSenderIdStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const adminId = req.user?.id;
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!adminId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      if (!status) {
        throw ApiError.badRequest("Status is required");
      }

      if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
        throw ApiError.badRequest("Invalid status");
      }

      const result = await SenderIdService.updateSenderIdStatus(
        adminId,
        id,
        status as SenderIdStatus,
        notes
      );

      res.status(200).json({
        success: true,
        message: `Sender ID ${status.toLowerCase()}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update sender ID
   */
  static async updateSenderId(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { purpose, sampleMessage, status, rejectionReason } = req.body;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const result = await SenderIdService.updateSenderId(userId, id, {
        purpose,
        sampleMessage,
        status,
        rejectionReason,
      });

      res.status(200).json({
        success: true,
        message: "Sender ID updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete sender ID
   */
  static async deleteSenderId(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const result = await SenderIdService.deleteSenderId(userId, id);

      res.status(200).json({
        success: true,
        message: "Sender ID deleted successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve sender ID request (Admin only)
   */
  static async approveSenderIdRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const adminId = req.user?.id;
      const { id } = req.params;
      const { adminNotes } = req.body;

      if (!adminId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      const result = await SenderIdService.approveSenderIdRequest(
        id,
        adminId,
        adminNotes
      );

      res.status(200).json({
        success: true,
        message: "Sender ID request approved successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject sender ID request (Admin only)
   */
  static async rejectSenderIdRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const adminId = req.user?.id;
      const { id } = req.params;
      const { rejectionReason, adminNotes } = req.body;

      if (!adminId) {
        throw ApiError.unauthorized("Not authenticated");
      }

      if (!rejectionReason) {
        throw ApiError.badRequest("Rejection reason is required");
      }

      const result = await SenderIdService.rejectSenderIdRequest(
        id,
        adminId,
        rejectionReason,
        adminNotes
      );

      res.status(200).json({
        success: true,
        message: "Sender ID request rejected successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending sender ID requests (Admin only)
   */
  static async getPendingSenderIdRequests(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await SenderIdService.getPendingSenderIdRequests();

      res.status(200).json({
        success: true,
        message: "Pending sender ID requests retrieved successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
