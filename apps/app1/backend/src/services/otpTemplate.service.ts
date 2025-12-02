import { PrismaClient, OtpType } from '@prisma/client';
import { ApiError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

interface CreateOtpTemplateParams {
  userId: string;
  name: string;
  type: OtpType;
  message: string;
  codeLength?: number;
  expiryMinutes?: number;
  maxAttempts?: number;
  isDefault?: boolean;
}

interface UpdateOtpTemplateParams {
  name?: string;
  message?: string;
  codeLength?: number;
  expiryMinutes?: number;
  maxAttempts?: number;
  isDefault?: boolean;
}

interface OtpTemplateFilters {
  type?: OtpType;
  search?: string;
  page?: number;
  limit?: number;
}

export class OtpTemplateService {
  /**
   * Create a new OTP template
   */
  static async createTemplate(params: CreateOtpTemplateParams) {
    try {
      const {
        userId,
        name,
        type,
        message,
        codeLength = 6,
        expiryMinutes = 5,
        maxAttempts = 3,
        isDefault = false
      } = params;

      // Validate template message contains {{code}} placeholder
      if (!message.includes('{{code}}')) {
        throw ApiError.badRequest('Template message must contain {{code}} placeholder');
      }

      // Check if template name already exists for this user
      const existingTemplate = await prisma.otpTemplate.findFirst({
        where: {
          userId,
          name
        }
      });

      if (existingTemplate) {
        throw ApiError.conflict('Template with this name already exists');
      }

      // If setting as default, unset other defaults for this type
      if (isDefault) {
        await prisma.otpTemplate.updateMany({
          where: {
            userId,
            type,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        });
      }

      const template = await prisma.otpTemplate.create({
        data: {
          userId,
          name,
          type,
          message,
          codeLength,
          expiryMinutes,
          maxAttempts,
          isDefault
        }
      });

      return template;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('OTP Template Service Error:', error);
      throw ApiError.internal('Failed to create OTP template');
    }
  }

  /**
   * Get templates with filtering and pagination
   */
  static async getTemplates(userId: string, filters: OtpTemplateFilters = {}) {
    try {
      const {
        type,
        search,
        page = 1,
        limit = 20
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = { userId };

      if (type) {
        where.type = type;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [templates, total] = await Promise.all([
        prisma.otpTemplate.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' }
          ]
        }),
        prisma.otpTemplate.count({ where })
      ]);

      return {
        data: templates,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('OTP Template Service Error:', error);
      throw ApiError.internal('Failed to get OTP templates');
    }
  }

  /**
   * Get template by ID
   */
  static async getTemplateById(templateId: string, userId: string) {
    try {
      const template = await prisma.otpTemplate.findFirst({
        where: {
          id: templateId,
          userId
        }
      });

      if (!template) {
        throw ApiError.notFound('OTP template not found');
      }

      return template;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('OTP Template Service Error:', error);
      throw ApiError.internal('Failed to get OTP template');
    }
  }

  /**
   * Update template
   */
  static async updateTemplate(templateId: string, userId: string, params: UpdateOtpTemplateParams) {
    try {
      const existingTemplate = await prisma.otpTemplate.findFirst({
        where: {
          id: templateId,
          userId
        }
      });

      if (!existingTemplate) {
        throw ApiError.notFound('OTP template not found');
      }

      // Validate message if provided
      if (params.message && !params.message.includes('{{code}}')) {
        throw ApiError.badRequest('Template message must contain {{code}} placeholder');
      }

      // Check if new name conflicts with existing template
      if (params.name && params.name !== existingTemplate.name) {
        const nameExists = await prisma.otpTemplate.findFirst({
          where: {
            userId,
            name: params.name,
            id: { not: templateId }
          }
        });

        if (nameExists) {
          throw ApiError.conflict('Template with this name already exists');
        }
      }

      // If setting as default, unset other defaults for this type
      if (params.isDefault) {
        await prisma.otpTemplate.updateMany({
          where: {
            userId,
            type: existingTemplate.type,
            isDefault: true,
            id: { not: templateId }
          },
          data: {
            isDefault: false
          }
        });
      }

      const updatedTemplate = await prisma.otpTemplate.update({
        where: { id: templateId },
        data: {
          name: params.name ?? existingTemplate.name,
          message: params.message ?? existingTemplate.message,
          codeLength: params.codeLength ?? existingTemplate.codeLength,
          expiryMinutes: params.expiryMinutes ?? existingTemplate.expiryMinutes,
          maxAttempts: params.maxAttempts ?? existingTemplate.maxAttempts,
          isDefault: params.isDefault ?? existingTemplate.isDefault
        }
      });

      return updatedTemplate;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('OTP Template Service Error:', error);
      throw ApiError.internal('Failed to update OTP template');
    }
  }

  /**
   * Delete template
   */
  static async deleteTemplate(templateId: string, userId: string) {
    try {
      const template = await prisma.otpTemplate.findFirst({
        where: {
          id: templateId,
          userId
        }
      });

      if (!template) {
        throw ApiError.notFound('OTP template not found');
      }

      await prisma.otpTemplate.delete({
        where: { id: templateId }
      });

      return { success: true, message: 'OTP template deleted successfully' };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('OTP Template Service Error:', error);
      throw ApiError.internal('Failed to delete OTP template');
    }
  }

  /**
   * Get default template for type
   */
  static async getDefaultTemplate(userId: string, type: OtpType) {
    try {
      const template = await prisma.otpTemplate.findFirst({
        where: {
          userId,
          type,
          isDefault: true
        }
      });

      return template;
    } catch (error) {
      console.error('OTP Template Service Error:', error);
      return null;
    }
  }

  /**
   * Set template as default
   */
  static async setAsDefault(templateId: string, userId: string) {
    try {
      const template = await prisma.otpTemplate.findFirst({
        where: {
          id: templateId,
          userId
        }
      });

      if (!template) {
        throw ApiError.notFound('OTP template not found');
      }

      // Unset other defaults for this type
      await prisma.otpTemplate.updateMany({
        where: {
          userId,
          type: template.type,
          isDefault: true,
          id: { not: templateId }
        },
        data: {
          isDefault: false
        }
      });

      // Set this template as default
      const updatedTemplate = await prisma.otpTemplate.update({
        where: { id: templateId },
        data: { isDefault: true }
      });

      return updatedTemplate;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('OTP Template Service Error:', error);
      throw ApiError.internal('Failed to set template as default');
    }
  }

  /**
   * Preview template with sample code
   */
  static previewTemplate(message: string, sampleCode = '123456') {
    try {
      if (!message.includes('{{code}}')) {
        throw ApiError.badRequest('Template message must contain {{code}} placeholder');
      }

      const preview = message.replace(/{{code}}/g, sampleCode);
      
      return {
        original: message,
        preview,
        sampleCode,
        characterCount: preview.length,
        smsCount: Math.ceil(preview.length / 160) // Approximate SMS count
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Template Preview Error:', error);
      throw ApiError.internal('Failed to preview template');
    }
  }

  /**
   * Get template statistics
   */
  static async getTemplateStats(userId: string) {
    try {
      const [totalTemplates, templatesByType, defaultTemplates] = await Promise.all([
        prisma.otpTemplate.count({ where: { userId } }),
        prisma.otpTemplate.groupBy({
          by: ['type'],
          where: { userId },
          _count: { id: true }
        }),
        prisma.otpTemplate.count({
          where: {
            userId,
            isDefault: true
          }
        })
      ]);

      return {
        totalTemplates,
        defaultTemplates,
        templatesByType: templatesByType.map(item => ({
          type: item.type,
          count: item._count.id
        }))
      };
    } catch (error) {
      console.error('Template Stats Error:', error);
      throw ApiError.internal('Failed to get template statistics');
    }
  }

  /**
   * Create default templates for new user
   */
  static async createDefaultTemplates(userId: string) {
    try {
      const defaultTemplates = [
        {
          name: 'Phone Verification',
          type: 'PHONE_VERIFICATION' as OtpType,
          message: 'Your verification code is {{code}}. Valid for 5 minutes. Do not share this code.',
          isDefault: true
        },
        {
          name: 'Login Verification',
          type: 'LOGIN_VERIFICATION' as OtpType,
          message: 'Your login verification code is {{code}}. If you did not request this, please ignore.',
          isDefault: true
        },
        {
          name: 'Password Reset',
          type: 'PASSWORD_RESET' as OtpType,
          message: 'Your password reset code is {{code}}. Valid for 5 minutes.',
          isDefault: true
        },
        {
          name: 'Transaction Verification',
          type: 'TRANSACTION_VERIFICATION' as OtpType,
          message: 'Your transaction verification code is {{code}}. Do not share this code.',
          isDefault: true
        }
      ];

      const createdTemplates = [];
      for (const template of defaultTemplates) {
        try {
          const created = await prisma.otpTemplate.create({
            data: {
              userId,
              ...template
            }
          });
          createdTemplates.push(created);
        } catch (error) {
          console.error(`Failed to create default template ${template.name}:`, error);
        }
      }

      return createdTemplates;
    } catch (error) {
      console.error('Create Default Templates Error:', error);
      throw ApiError.internal('Failed to create default templates');
    }
  }
}
