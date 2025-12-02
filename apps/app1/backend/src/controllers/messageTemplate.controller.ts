import { Request, Response, NextFunction } from 'express';
import { MessageTemplateService } from '../services/messageTemplate.service';
import { ApiError } from '../middleware/error.middleware';

export class MessageTemplateController {
  /**
   * Get all message templates for a user
   * @route GET /api/templates
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }
      
      const templates = await MessageTemplateService.getAll(userId);
      return res.status(200).json(templates);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a message template by ID
   * @route GET /api/templates/:id
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }
      
      const template = await MessageTemplateService.getById(userId, id);
      
      if (!template) {
        throw ApiError.notFound('Template not found');
      }
      
      return res.status(200).json(template);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new message template
   * @route POST /api/templates
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { name, content } = req.body;
      
      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }
      
      if (!name || !content) {
        throw ApiError.badRequest('Name and content are required');
      }
      
      const template = await MessageTemplateService.create(userId, { name, content });
      return res.status(201).json(template);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a message template
   * @route PUT /api/templates/:id
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { name, content } = req.body;
      
      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }
      
      if (!name && !content) {
        throw ApiError.badRequest('At least one field (name or content) is required');
      }
      
      const template = await MessageTemplateService.update(userId, id, { name, content });
      
      if (!template) {
        throw ApiError.notFound('Template not found');
      }
      
      return res.status(200).json(template);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a message template
   * @route DELETE /api/templates/:id
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }
      
      await MessageTemplateService.delete(userId, id);
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
