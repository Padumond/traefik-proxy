import { PrismaClient, CampaignStatus } from "@prisma/client";
import { ApiError } from "../middleware/error.middleware";
import { SmsService } from "./sms.service";
import { ArkeselService } from "./arkessel.service";

const prisma = new PrismaClient();

interface CreateCampaignParams {
  userId: string;
  name: string;
  message: string;
  templateId?: string;
  contactGroupId?: string;
  senderId: string;
  scheduledAt?: Date;
}

interface UpdateCampaignParams {
  name?: string;
  message?: string;
  scheduledAt?: Date;
  status?: CampaignStatus;
}

interface CampaignFilters {
  status?: CampaignStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export class CampaignService {
  /**
   * Create a new SMS campaign
   */
  static async createCampaign(params: CreateCampaignParams) {
    try {
      // Validate sender ID belongs to user and is approved
      const senderIdRecord = await prisma.senderID.findFirst({
        where: {
          userId: params.userId,
          senderId: params.senderId,
          status: "APPROVED",
        },
      });

      if (!senderIdRecord) {
        throw ApiError.badRequest("Invalid or unapproved sender ID");
      }

      // Validate contact group if provided
      let contactGroup = null;
      if (params.contactGroupId) {
        contactGroup = await prisma.contactGroup.findFirst({
          where: {
            id: params.contactGroupId,
            userId: params.userId,
          },
          include: {
            _count: {
              select: { contacts: true },
            },
          },
        });

        if (!contactGroup) {
          throw ApiError.notFound("Contact group not found");
        }
      }

      // Validate template if provided
      let template = null;
      if (params.templateId) {
        template = await prisma.smsTemplate.findFirst({
          where: {
            id: params.templateId,
            userId: params.userId,
          },
        });

        if (!template) {
          throw ApiError.notFound("SMS template not found");
        }
      }

      // Calculate estimated cost and recipient count
      let totalRecipients = 0;
      let estimatedCost = 0;

      if (contactGroup) {
        totalRecipients = contactGroup._count.contacts;
        const smsCount = ArkeselService.calculateSmsCount(params.message);
        const costPerSms = 0.059; // GH₵0.059 per SMS (standard rate)
        estimatedCost = costPerSms * totalRecipients * smsCount;
      }

      // Create campaign
      const campaign = await prisma.campaign.create({
        data: {
          userId: params.userId,
          name: params.name,
          message: params.message,
          templateId: params.templateId,
          contactGroupId: params.contactGroupId,
          senderId: params.senderId,
          scheduledAt: params.scheduledAt,
          totalRecipients,
          estimatedCost,
          status: params.scheduledAt ? "SCHEDULED" : "DRAFT",
        },
        include: {
          template: true,
          contactGroup: {
            include: {
              _count: {
                select: { contacts: true },
              },
            },
          },
        },
      });

      return campaign;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Campaign Service Error:", error);
      throw ApiError.internal("Failed to create campaign");
    }
  }

  /**
   * Get campaigns with filtering and pagination
   */
  static async getCampaigns(userId: string, filters: CampaignFilters = {}) {
    try {
      const { status, search, page = 1, limit = 20 } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = { userId };

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { message: { contains: search, mode: "insensitive" } },
        ];
      }

      const [campaigns, total] = await Promise.all([
        prisma.campaign.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            template: {
              select: {
                id: true,
                name: true,
              },
            },
            contactGroup: {
              select: {
                id: true,
                name: true,
                _count: {
                  select: { contacts: true },
                },
              },
            },
          },
        }),
        prisma.campaign.count({ where }),
      ]);

      return {
        data: campaigns,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Campaign Service Error:", error);
      throw ApiError.internal("Failed to get campaigns");
    }
  }

  /**
   * Get campaign by ID
   */
  static async getCampaignById(campaignId: string, userId: string) {
    try {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: campaignId,
          userId,
        },
        include: {
          template: true,
          contactGroup: {
            include: {
              _count: {
                select: { contacts: true },
              },
            },
          },
        },
      });

      if (!campaign) {
        throw ApiError.notFound("Campaign not found");
      }

      return campaign;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Campaign Service Error:", error);
      throw ApiError.internal("Failed to get campaign");
    }
  }

  /**
   * Update campaign
   */
  static async updateCampaign(
    campaignId: string,
    userId: string,
    params: UpdateCampaignParams
  ) {
    try {
      const existingCampaign = await prisma.campaign.findFirst({
        where: {
          id: campaignId,
          userId,
        },
      });

      if (!existingCampaign) {
        throw ApiError.notFound("Campaign not found");
      }

      // Prevent editing campaigns that are already sending or completed
      if (["SENDING", "COMPLETED"].includes(existingCampaign.status)) {
        throw ApiError.badRequest(
          "Cannot edit campaign that is sending or completed"
        );
      }

      // Recalculate cost if message changed
      let estimatedCost = existingCampaign.estimatedCost;
      if (params.message && params.message !== existingCampaign.message) {
        const smsCount = ArkeselService.calculateSmsCount(params.message);
        const costPerSms = 0.01;
        estimatedCost =
          costPerSms * existingCampaign.totalRecipients * smsCount;
      }

      const updatedCampaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          name: params.name ?? existingCampaign.name,
          message: params.message ?? existingCampaign.message,
          scheduledAt: params.scheduledAt ?? existingCampaign.scheduledAt,
          status: params.status ?? existingCampaign.status,
          estimatedCost,
        },
        include: {
          template: true,
          contactGroup: {
            include: {
              _count: {
                select: { contacts: true },
              },
            },
          },
        },
      });

      return updatedCampaign;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Campaign Service Error:", error);
      throw ApiError.internal("Failed to update campaign");
    }
  }

  /**
   * Delete campaign
   */
  static async deleteCampaign(campaignId: string, userId: string) {
    try {
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: campaignId,
          userId,
        },
      });

      if (!campaign) {
        throw ApiError.notFound("Campaign not found");
      }

      // Prevent deleting campaigns that are currently sending
      if (campaign.status === "SENDING") {
        throw ApiError.badRequest(
          "Cannot delete campaign that is currently sending"
        );
      }

      await prisma.campaign.delete({
        where: { id: campaignId },
      });

      return { success: true, message: "Campaign deleted successfully" };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Campaign Service Error:", error);
      throw ApiError.internal("Failed to delete campaign");
    }
  }

  /**
   * Start campaign (send immediately)
   */
  static async startCampaign(campaignId: string, userId: string) {
    try {
      const campaign = await this.getCampaignById(campaignId, userId);

      if (!campaign.contactGroup) {
        throw ApiError.badRequest(
          "Campaign must have a contact group to start"
        );
      }

      if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
        throw ApiError.badRequest(
          "Campaign can only be started from DRAFT or SCHEDULED status"
        );
      }

      // Update campaign status to SENDING
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: "SENDING",
          startedAt: new Date(),
        },
      });

      // Process campaign in background
      this.processCampaign(campaignId).catch((error) => {
        console.error("Campaign processing error:", error);
      });

      return { success: true, message: "Campaign started successfully" };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Campaign Service Error:", error);
      throw ApiError.internal("Failed to start campaign");
    }
  }

  /**
   * Process campaign (send SMS to all contacts in group)
   */
  private static async processCampaign(campaignId: string) {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          contactGroup: {
            include: {
              contacts: {
                include: {
                  contact: true,
                },
              },
            },
          },
        },
      });

      if (!campaign || !campaign.contactGroup) {
        throw new Error("Campaign or contact group not found");
      }

      const contacts = campaign.contactGroup.contacts.map(
        (membership) => membership.contact
      );
      const phoneNumbers = contacts.map((contact) => contact.phone);

      let sentCount = 0;
      let failedCount = 0;
      let actualCost = 0;

      // Send SMS in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < phoneNumbers.length; i += batchSize) {
        const batch = phoneNumbers.slice(i, i + batchSize);

        try {
          const result = await SmsService.sendSms({
            senderId: campaign.senderId,
            message: campaign.message,
            recipients: batch,
            userId: campaign.userId,
          });

          if (result.success) {
            sentCount += batch.length;
            actualCost += result.cost || 0;
          } else {
            failedCount += batch.length;
          }
        } catch (error) {
          console.error("Batch SMS error:", error);
          failedCount += batch.length;
        }

        // Update progress
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            sentCount,
            failedCount,
            actualCost,
          },
        });

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Mark campaign as completed
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          sentCount,
          failedCount,
          actualCost,
        },
      });
    } catch (error) {
      console.error("Campaign processing error:", error);

      // Mark campaign as failed
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: "FAILED",
        },
      });
    }
  }

  /**
   * Get campaign statistics
   */
  static async getCampaignStats(userId: string) {
    try {
      const [totalCampaigns, activeCampaigns, completedCampaigns, totalSent] =
        await Promise.all([
          prisma.campaign.count({ where: { userId } }),
          prisma.campaign.count({
            where: {
              userId,
              status: { in: ["DRAFT", "SCHEDULED", "SENDING"] },
            },
          }),
          prisma.campaign.count({
            where: {
              userId,
              status: "COMPLETED",
            },
          }),
          prisma.campaign.aggregate({
            where: { userId },
            _sum: { sentCount: true },
          }),
        ]);

      return {
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        totalSent: totalSent._sum.sentCount || 0,
      };
    } catch (error) {
      console.error("Campaign Stats Error:", error);
      throw ApiError.internal("Failed to get campaign statistics");
    }
  }
}
