import { Request, Response, NextFunction } from 'express';
import { SmsTemplateService } from '../services/smsTemplate.service';
import { ApiError } from '../middleware/error.middleware';

export class SmsTemplateController {
  /**
   * Create a new SMS template
   */
  static async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { name, content, variables, description } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Template name is required'
        });
      }

      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Template content is required'
        });
      }

      // Validate template content
      const validation = SmsTemplateService.validateTemplate(content);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Template validation failed',
          errors: validation.errors
        });
      }

      const template = await SmsTemplateService.createTemplate({
        userId,
        name,
        content,
        variables,
        description
      });

      res.status(201).json({
        success: true,
        message: 'SMS template created successfully',
        data: template
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to create SMS template'
        });
      }
    }
  }

  /**
   * Get templates with filtering and pagination
   */
  static async getTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { search, page, limit } = req.query;

      const filters: any = {};
      if (search) filters.search = search as string;
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await SmsTemplateService.getTemplates(userId, filters);

      res.status(200).json({
        success: true,
        message: 'SMS templates retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get SMS templates'
      });
    }
  }

  /**
   * Get template by ID
   */
  static async getTemplateById(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;

      const template = await SmsTemplateService.getTemplateById(id, userId);

      res.status(200).json({
        success: true,
        message: 'SMS template retrieved successfully',
        data: template
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get SMS template'
        });
      }
    }
  }

  /**
   * Update template
   */
  static async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;
      const updateData = req.body;

      // Validate template content if provided
      if (updateData.content) {
        const validation = SmsTemplateService.validateTemplate(updateData.content);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: 'Template validation failed',
            errors: validation.errors
          });
        }
      }

      const template = await SmsTemplateService.updateTemplate(id, userId, updateData);

      res.status(200).json({
        success: true,
        message: 'SMS template updated successfully',
        data: template
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to update SMS template'
        });
      }
    }
  }

  /**
   * Delete template
   */
  static async deleteTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;

      const result = await SmsTemplateService.deleteTemplate(id, userId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to delete SMS template'
        });
      }
    }
  }

  /**
   * Preview template with sample data
   */
  static async previewTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { content, sampleData } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Template content is required'
        });
      }

      const preview = SmsTemplateService.getTemplatePreview(content, sampleData);

      res.status(200).json({
        success: true,
        message: 'Template preview generated successfully',
        data: {
          original: content,
          preview,
          variables: SmsTemplateService['extractVariables'](content)
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate template preview'
      });
    }
  }

  /**
   * Validate template content
   */
  static async validateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Template content is required'
        });
      }

      const validation = SmsTemplateService.validateTemplate(content);

      res.status(200).json({
        success: validation.valid,
        message: validation.valid ? 'Template is valid' : 'Template validation failed',
        data: {
          valid: validation.valid,
          errors: validation.errors,
          variables: SmsTemplateService['extractVariables'](content)
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to validate template'
      });
    }
  }

  /**
   * Process template with variables
   */
  static async processTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { content, variables } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Template content is required'
        });
      }

      if (!variables || typeof variables !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Variables object is required'
        });
      }

      const processedContent = SmsTemplateService.processTemplate(content, variables);

      res.status(200).json({
        success: true,
        message: 'Template processed successfully',
        data: {
          original: content,
          processed: processedContent,
          variables
        }
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to process template'
        });
      }
    }
  }

  /**
   * Get template statistics
   */
  static async getTemplateStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;

      const stats = await SmsTemplateService.getTemplateStats(userId);

      res.status(200).json({
        success: true,
        message: 'Template statistics retrieved successfully',
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get template statistics'
      });
    }
  }

  /**
   * Duplicate template
   */
  static async duplicateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;
      const { name } = req.body;

      // Get original template
      const originalTemplate = await SmsTemplateService.getTemplateById(id, userId);

      // Create duplicate with new name
      const duplicatedTemplate = await SmsTemplateService.createTemplate({
        userId,
        name: name || `${originalTemplate.name} (Copy)`,
        content: originalTemplate.content,
        variables: originalTemplate.variables,
        description: originalTemplate.description
      });

      res.status(201).json({
        success: true,
        message: 'Template duplicated successfully',
        data: duplicatedTemplate
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to duplicate template'
        });
      }
    }
  }

  /**
   * Get template usage analytics
   */
  static async getTemplateUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;

      const template = await SmsTemplateService.getTemplateById(id, userId);

      res.status(200).json({
        success: true,
        message: 'Template usage retrieved successfully',
        data: {
          templateId: template.id,
          templateName: template.name,
          totalCampaigns: template.campaigns?.length || 0,
          recentCampaigns: template.campaigns || []
        }
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        res.status(error.statusCode || 404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get template usage'
        });
      }
    }
  }
}
