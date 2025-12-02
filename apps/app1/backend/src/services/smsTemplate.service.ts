import { PrismaClient } from '@prisma/client';
import { ApiError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

interface CreateTemplateParams {
  userId: string;
  name: string;
  content: string;
  variables?: string[];
  description?: string;
}

interface UpdateTemplateParams {
  name?: string;
  content?: string;
  variables?: string[];
  description?: string;
}

interface TemplateFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export class SmsTemplateService {
  /**
   * Create a new SMS template
   */
  static async createTemplate(params: CreateTemplateParams) {
    try {
      // Check if template name already exists for this user
      const existingTemplate = await prisma.smsTemplate.findFirst({
        where: {
          userId: params.userId,
          name: params.name
        }
      });

      if (existingTemplate) {
        throw ApiError.conflict('Template with this name already exists');
      }

      // Extract variables from template content
      const extractedVariables = this.extractVariables(params.content);
      const variables = params.variables || extractedVariables;

      const template = await prisma.smsTemplate.create({
        data: {
          userId: params.userId,
          name: params.name,
          content: params.content,
          variables,
          description: params.description
        }
      });

      return template;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('SMS Template Service Error:', error);
      throw ApiError.internal('Failed to create SMS template');
    }
  }

  /**
   * Get templates with filtering and pagination
   */
  static async getTemplates(userId: string, filters: TemplateFilters = {}) {
    try {
      const {
        search,
        page = 1,
        limit = 20
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = { userId };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [templates, total] = await Promise.all([
        prisma.smsTemplate.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                campaigns: true
              }
            }
          }
        }),
        prisma.smsTemplate.count({ where })
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
      console.error('SMS Template Service Error:', error);
      throw ApiError.internal('Failed to get SMS templates');
    }
  }

  /**
   * Get template by ID
   */
  static async getTemplateById(templateId: string, userId: string) {
    try {
      const template = await prisma.smsTemplate.findFirst({
        where: {
          id: templateId,
          userId
        },
        include: {
          campaigns: {
            select: {
              id: true,
              name: true,
              status: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      });

      if (!template) {
        throw ApiError.notFound('SMS template not found');
      }

      return template;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('SMS Template Service Error:', error);
      throw ApiError.internal('Failed to get SMS template');
    }
  }

  /**
   * Update template
   */
  static async updateTemplate(templateId: string, userId: string, params: UpdateTemplateParams) {
    try {
      const existingTemplate = await prisma.smsTemplate.findFirst({
        where: {
          id: templateId,
          userId
        }
      });

      if (!existingTemplate) {
        throw ApiError.notFound('SMS template not found');
      }

      // Check if new name conflicts with existing template
      if (params.name && params.name !== existingTemplate.name) {
        const nameExists = await prisma.smsTemplate.findFirst({
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

      // Extract variables from content if content is updated
      let variables = params.variables || existingTemplate.variables;
      if (params.content) {
        const extractedVariables = this.extractVariables(params.content);
        variables = params.variables || extractedVariables;
      }

      const updatedTemplate = await prisma.smsTemplate.update({
        where: { id: templateId },
        data: {
          name: params.name ?? existingTemplate.name,
          content: params.content ?? existingTemplate.content,
          variables,
          description: params.description ?? existingTemplate.description
        }
      });

      return updatedTemplate;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('SMS Template Service Error:', error);
      throw ApiError.internal('Failed to update SMS template');
    }
  }

  /**
   * Delete template
   */
  static async deleteTemplate(templateId: string, userId: string) {
    try {
      const template = await prisma.smsTemplate.findFirst({
        where: {
          id: templateId,
          userId
        },
        include: {
          _count: {
            select: { campaigns: true }
          }
        }
      });

      if (!template) {
        throw ApiError.notFound('SMS template not found');
      }

      // Check if template is being used by any campaigns
      if (template._count.campaigns > 0) {
        throw ApiError.badRequest('Cannot delete template that is being used by campaigns');
      }

      await prisma.smsTemplate.delete({
        where: { id: templateId }
      });

      return { success: true, message: 'SMS template deleted successfully' };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('SMS Template Service Error:', error);
      throw ApiError.internal('Failed to delete SMS template');
    }
  }

  /**
   * Process template with variables
   */
  static processTemplate(content: string, variables: Record<string, string>): string {
    try {
      let processedContent = content;

      // Replace variables in the format {{variableName}}
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        processedContent = processedContent.replace(regex, variables[key] || '');
      });

      return processedContent;
    } catch (error) {
      console.error('Template Processing Error:', error);
      throw ApiError.internal('Failed to process template');
    }
  }

  /**
   * Extract variables from template content
   */
  private static extractVariables(content: string): string[] {
    try {
      const variableRegex = /{{\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*}}/g;
      const variables: string[] = [];
      let match;

      while ((match = variableRegex.exec(content)) !== null) {
        const variable = match[1].trim();
        if (!variables.includes(variable)) {
          variables.push(variable);
        }
      }

      return variables;
    } catch (error) {
      console.error('Variable Extraction Error:', error);
      return [];
    }
  }

  /**
   * Validate template content
   */
  static validateTemplate(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Check if content is not empty
      if (!content || content.trim().length === 0) {
        errors.push('Template content cannot be empty');
      }

      // Check content length (SMS limit)
      if (content.length > 1600) { // Allow for long SMS
        errors.push('Template content is too long (max 1600 characters)');
      }

      // Check for valid variable syntax
      const variableRegex = /{{\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*}}/g;
      const invalidVariableRegex = /{{[^}]*}}/g;
      
      const validVariables = content.match(variableRegex) || [];
      const allBraces = content.match(invalidVariableRegex) || [];

      if (allBraces.length > validVariables.length) {
        errors.push('Invalid variable syntax. Use {{variableName}} format');
      }

      // Check for unclosed braces
      const openBraces = (content.match(/{/g) || []).length;
      const closeBraces = (content.match(/}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        errors.push('Unclosed braces in template');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: ['Failed to validate template']
      };
    }
  }

  /**
   * Get template preview with sample data
   */
  static getTemplatePreview(content: string, sampleData?: Record<string, string>): string {
    try {
      const variables = this.extractVariables(content);
      
      // Use provided sample data or generate default values
      const defaultSampleData: Record<string, string> = {
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        company: 'Acme Corp',
        amount: '100.00',
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
      };

      const mergedData = { ...defaultSampleData, ...sampleData };
      
      return this.processTemplate(content, mergedData);
    } catch (error) {
      console.error('Template Preview Error:', error);
      return content;
    }
  }

  /**
   * Get template statistics
   */
  static async getTemplateStats(userId: string) {
    try {
      const [totalTemplates, recentTemplates, mostUsedTemplate] = await Promise.all([
        prisma.smsTemplate.count({ where: { userId } }),
        prisma.smsTemplate.count({
          where: {
            userId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        }),
        prisma.smsTemplate.findFirst({
          where: { userId },
          include: {
            _count: {
              select: { campaigns: true }
            }
          },
          orderBy: {
            campaigns: {
              _count: 'desc'
            }
          }
        })
      ]);

      return {
        totalTemplates,
        recentTemplates,
        mostUsedTemplate: mostUsedTemplate ? {
          id: mostUsedTemplate.id,
          name: mostUsedTemplate.name,
          usageCount: mostUsedTemplate._count.campaigns
        } : null
      };
    } catch (error) {
      console.error('Template Stats Error:', error);
      throw ApiError.internal('Failed to get template statistics');
    }
  }
}
