import { prisma } from "../server";
import { ApiError } from "../middleware/error.middleware";
import { ArkeselService } from "./arkessel.service";
import { MessageTemplateService } from "./messageTemplate.service";

interface CreateCampaignParams {
  userId: string;
  name: string;
  templateId?: string;
  message: string;
  senderId: string;
  recipients: string[];
  contactGroupIds?: string[];
  scheduledAt?: Date;
  variables?: Record<string, string>;
  campaignType: "IMMEDIATE" | "SCHEDULED" | "RECURRING";
  recurringConfig?: {
    frequency: "DAILY" | "WEEKLY" | "MONTHLY";
    interval: number;
    endDate?: Date;
  };
}

export class SmsCampaignService {
  /**
   * Create a new SMS campaign
   */
  static async createCampaign(params: CreateCampaignParams) {
    try {
      const {
        userId,
        name,
        templateId,
        message,
        senderId,
        recipients,
        contactGroupIds = [],
        scheduledAt,
        variables = {},
        campaignType,
        recurringConfig,
      } = params;

      // Validate sender ID belongs to user and is approved
      const senderIdRecord = await prisma.senderID.findFirst({
        where: {
          userId,
          senderId,
          status: "APPROVED",
        },
      });

      if (!senderIdRecord) {
        throw ApiError.badRequest("Invalid or unapproved sender ID");
      }

      // Process template if provided
      let finalMessage = message;
      if (templateId) {
        const template = await MessageTemplateService.getById(
          userId,
          templateId
        );
        if (template) {
          finalMessage = MessageTemplateService.processTemplate(
            template.content,
            variables
          );
        }
      }

      // Get contacts from groups if specified
      let allRecipients = [...recipients];
      if (contactGroupIds.length > 0) {
        const groupContacts = await prisma.contact.findMany({
          where: {
            userId,
            groups: {
              some: {
                groupId: {
                  in: contactGroupIds,
                },
              },
            },
          },
          select: {
            phone: true,
          },
        });

        allRecipients = [
          ...allRecipients,
          ...groupContacts.map((c) => c.phone),
        ];
      }

      // Remove duplicates
      allRecipients = [...new Set(allRecipients)];

      if (allRecipients.length === 0) {
        throw ApiError.badRequest("No recipients specified");
      }

      // Calculate estimated cost
      const estimatedCost = this.calculateCampaignCost(
        finalMessage,
        allRecipients.length
      );

      // Check user balance
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.walletBalance < estimatedCost) {
        throw ApiError.badRequest("Insufficient balance for campaign");
      }

      // Create campaign
      const campaign = await prisma.smsCampaign.create({
        data: {
          userId,
          name,
          templateId,
          message: finalMessage,
          senderId,
          recipients: allRecipients,
          contactGroupIds,
          scheduledAt,
          variables,
          campaignType,
          recurringConfig,
          estimatedCost,
          status: campaignType === "IMMEDIATE" ? "PROCESSING" : "SCHEDULED",
          totalRecipients: allRecipients.length,
        },
      });

      // If immediate campaign, start sending
      if (campaignType === "IMMEDIATE") {
        this.processCampaign(campaign.id).catch(console.error);
      }

      return campaign;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Campaign creation error:", error);
      throw ApiError.internal("Failed to create campaign");
    }
  }

  /**
   * Process campaign (send messages)
   */
  static async processCampaign(campaignId: string) {
    try {
      const campaign = await prisma.smsCampaign.findUnique({
        where: { id: campaignId },
        include: { user: true },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // Update campaign status
      await prisma.smsCampaign.update({
        where: { id: campaignId },
        data: { status: "SENDING", startedAt: new Date() },
      });

      let successCount = 0;
      let failureCount = 0;
      const batchSize = 10; // Send in batches to avoid overwhelming the API

      // Process recipients in batches
      for (let i = 0; i < campaign.recipients.length; i += batchSize) {
        const batch = campaign.recipients.slice(i, i + batchSize);

        for (const recipient of batch) {
          try {
            // Send SMS via Arkessel
            const response = await ArkeselService.sendSms({
              to: recipient,
              message: campaign.message,
              sender: campaign.senderId,
            });

            // Create message record
            await prisma.smsLog.create({
              data: {
                userId: campaign.userId,
                campaignId: campaign.id,
                recipients: [recipient],
                message: campaign.message,
                status: "SENT",
                cost: this.calculateMessageCost(campaign.message),
                providerRef:
                  Array.isArray(response.data) && response.data.length > 0
                    ? response.data[0].id
                    : undefined,
              },
            });

            successCount++;
          } catch (error) {
            console.error(`Failed to send to ${recipient}:`, error);

            // Create failed message record
            await prisma.smsLog.create({
              data: {
                userId: campaign.userId,
                campaignId: campaign.id,
                recipients: [recipient],
                message: campaign.message,
                status: "FAILED",
                cost: 0,
              },
            });

            failureCount++;
          }

          // Add delay between messages to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        // Delay between batches
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Update campaign completion
      await prisma.smsCampaign.update({
        where: { id: campaignId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          sentCount: successCount,
          failedCount: failureCount,
          actualCost:
            successCount * this.calculateMessageCost(campaign.message),
        },
      });

      console.log(
        `Campaign ${campaignId} completed: ${successCount} sent, ${failureCount} failed`
      );
    } catch (error) {
      console.error(`Campaign ${campaignId} processing error:`, error);

      // Update campaign status to failed
      await prisma.smsCampaign.update({
        where: { id: campaignId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          failureReason:
            error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  /**
   * Get user campaigns
   */
  static async getUserCampaigns(
    userId: string,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
      const { status, limit = 20, offset = 0 } = options;

      const where: any = { userId };
      if (status) {
        where.status = status;
      }

      const [campaigns, total] = await Promise.all([
        prisma.smsCampaign.findMany({
          where,
          include: {
            template: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                smsLogs: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: limit,
          skip: offset,
        }),
        prisma.smsCampaign.count({ where }),
      ]);

      return {
        campaigns,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error("Get campaigns error:", error);
      throw ApiError.internal("Failed to get campaigns");
    }
  }

  /**
   * Get campaign details
   */
  static async getCampaignById(campaignId: string, userId: string) {
    try {
      const campaign = await prisma.smsCampaign.findFirst({
        where: {
          id: campaignId,
          userId,
        },
        include: {
          template: true,
          smsLogs: {
            take: 100, // Limit message details
            orderBy: {
              sentAt: "desc",
            },
          },
          _count: {
            select: {
              smsLogs: true,
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
      console.error("Get campaign error:", error);
      throw ApiError.internal("Failed to get campaign");
    }
  }

  /**
   * Calculate campaign cost
   */
  private static calculateCampaignCost(
    message: string,
    recipientCount: number
  ): number {
    const costPerMessage = this.calculateMessageCost(message);
    return costPerMessage * recipientCount;
  }

  /**
   * Calculate message cost
   */
  private static calculateMessageCost(message: string): number {
    // Basic cost calculation - 1 SMS unit per 160 characters
    const smsUnits = Math.ceil(message.length / 160);
    const costPerUnit = 0.1; // $0.10 per SMS unit
    return smsUnits * costPerUnit;
  }

  /**
   * Cancel scheduled campaign
   */
  static async cancelCampaign(campaignId: string, userId: string) {
    try {
      const campaign = await prisma.smsCampaign.findFirst({
        where: {
          id: campaignId,
          userId,
          status: "SCHEDULED",
        },
      });

      if (!campaign) {
        throw ApiError.notFound("Scheduled campaign not found");
      }

      await prisma.smsCampaign.update({
        where: { id: campaignId },
        data: {
          status: "CANCELLED",
          completedAt: new Date(),
        },
      });

      return { success: true, message: "Campaign cancelled successfully" };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("Cancel campaign error:", error);
      throw ApiError.internal("Failed to cancel campaign");
    }
  }
}
