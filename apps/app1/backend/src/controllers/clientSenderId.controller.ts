import { Request, Response, NextFunction } from "express";
import { SenderIdService } from "../services/senderId.service";
import { ApiError } from "../middleware/error.middleware";

export class ClientSenderIdController {
  /**
   * Get all sender IDs for the client
   */
  static async getSenderIds(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).clientApiInfo;
      const { status } = req.query;

      const filters: any = {};
      if (
        status &&
        ["PENDING", "APPROVED", "REJECTED"].includes(
          (status as string).toUpperCase()
        )
      ) {
        filters.status = (status as string).toUpperCase();
      }

      const senderIds = await SenderIdService.getSenderIds(userId, filters);

      // Format response for client API
      const formattedSenderIds = senderIds.data.map((senderId: any) => ({
        id: senderId.id,
        sender_id: senderId.senderId,
        status: senderId.status.toLowerCase(),
        purpose: senderId.purpose,
        sample_message: senderId.sampleMessage,
        created_at: senderId.submittedAt,
        approved_at: senderId.approvedAt,
        rejected_at: senderId.rejectedAt,
        rejection_reason: senderId.rejectionReason,
      }));

      res.status(200).json({
        success: true,
        data: formattedSenderIds,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to retrieve sender IDs",
        },
      });
    }
  }

  /**
   * Get approved sender IDs only
   */
  static async getApprovedSenderIds(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).clientApiInfo;

      const senderIds = await SenderIdService.getSenderIds(userId, {
        status: "APPROVED",
      });

      // Format response for client API - only essential fields for approved IDs
      const formattedSenderIds = senderIds.data.map((senderId: any) => ({
        id: senderId.id,
        sender_id: senderId.senderId,
        purpose: senderId.purpose,
        approved_at: senderId.approvedAt,
      }));

      res.status(200).json({
        success: true,
        data: formattedSenderIds,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to retrieve approved sender IDs",
        },
      });
    }
  }

  /**
   * Request a new sender ID
   */
  static async requestSenderId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).clientApiInfo;
      const { sender_id, purpose, sample_message } = req.body;

      // Validate required fields
      if (!sender_id || !purpose || !sample_message) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMETERS",
            message: "Required parameters: sender_id, purpose, sample_message",
          },
        });
      }

      // Validate sender ID format
      if (!/^[A-Za-z0-9]{3,11}$/.test(sender_id)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_SENDER_ID",
            message: "Sender ID must be 3-11 alphanumeric characters",
          },
        });
      }

      const result = await SenderIdService.createSenderId({
        userId,
        senderId: sender_id,
        purpose,
        sampleMessage: sample_message,
      });

      res.status(201).json({
        success: true,
        data: {
          id: result.id,
          sender_id: result.senderId,
          status: result.status.toLowerCase(),
          purpose: result.purpose,
          sample_message: result.sampleMessage,
          created_at: result.submittedAt,
          message: "Sender ID request submitted for approval",
        },
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 400).json({
          success: false,
          error: {
            code: error.message.includes("already exists")
              ? "SENDER_ID_EXISTS"
              : "API_ERROR",
            message: error.message,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Unable to submit sender ID request",
          },
        });
      }
    }
  }

  /**
   * Get sender ID status
   */
  static async getSenderIdStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = (req as any).clientApiInfo;
      const { sender_id } = req.params;

      if (!sender_id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMETERS",
            message: "Sender ID is required",
          },
        });
      }

      const senderIdRecord = await SenderIdService.getSenderIdByName(
        userId,
        sender_id
      );

      if (!senderIdRecord) {
        return res.status(404).json({
          success: false,
          error: {
            code: "SENDER_ID_NOT_FOUND",
            message: "Sender ID not found",
          },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          id: senderIdRecord.id,
          sender_id: senderIdRecord.senderId,
          status: senderIdRecord.status.toLowerCase(),
          purpose: senderIdRecord.purpose,
          sample_message: senderIdRecord.sampleMessage,
          created_at: senderIdRecord.submittedAt,
          approved_at: senderIdRecord.approvedAt,
          rejected_at: senderIdRecord.rejectedAt,
          rejection_reason: senderIdRecord.rejectionReason,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to retrieve sender ID status",
        },
      });
    }
  }

  /**
   * Validate sender ID format
   */
  static async validateSenderId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { sender_id } = req.body;

      if (!sender_id) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PARAMETERS",
            message: "Sender ID is required",
          },
        });
      }

      const isValid = /^[A-Za-z0-9]{3,11}$/.test(sender_id);
      const issues = [];

      if (sender_id.length < 3) {
        issues.push("Must be at least 3 characters");
      }
      if (sender_id.length > 11) {
        issues.push("Must be no more than 11 characters");
      }
      if (!/^[A-Za-z0-9]+$/.test(sender_id)) {
        issues.push("Must contain only letters and numbers");
      }

      res.status(200).json({
        success: true,
        data: {
          sender_id: sender_id,
          is_valid: isValid,
          issues: issues.length > 0 ? issues : undefined,
          recommendations: isValid
            ? undefined
            : [
                "Use 3-11 alphanumeric characters",
                "Avoid special characters and spaces",
                "Use your brand name or service name",
              ],
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to validate sender ID",
        },
      });
    }
  }
}
