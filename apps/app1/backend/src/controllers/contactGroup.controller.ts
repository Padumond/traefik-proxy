import { Request, Response, NextFunction } from 'express';
import { ContactGroupService } from '../services/contactGroup.service';
import { ApiError } from '../middleware/error.middleware';

export class ContactGroupController {
  /**
   * Get all contact groups for a user
   * @route GET /api/contacts/groups
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }
      
      const groups = await ContactGroupService.getAll(userId);
      return res.status(200).json(groups);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a contact group by ID
   * @route GET /api/contacts/groups/:id
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }
      
      const group = await ContactGroupService.getById(userId, id);
      
      if (!group) {
        throw ApiError.notFound('Contact group not found');
      }
      
      return res.status(200).json(group);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new contact group
   * @route POST /api/contacts/groups
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { name, description } = req.body;
      
      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }
      
      if (!name) {
        throw ApiError.badRequest('Name is required');
      }
      
      const group = await ContactGroupService.create(userId, { name, description });
      return res.status(201).json(group);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a contact group
   * @route PUT /api/contacts/groups/:id
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { name, description } = req.body;
      
      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }
      
      if (!name && !description) {
        throw ApiError.badRequest('At least one field (name or description) is required');
      }
      
      const group = await ContactGroupService.update(userId, id, { name, description });
      
      if (!group) {
        throw ApiError.notFound('Contact group not found');
      }
      
      return res.status(200).json(group);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a contact group
   * @route DELETE /api/contacts/groups/:id
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }
      
      await ContactGroupService.delete(userId, id);
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add contacts to a group
   * @route POST /api/contacts/groups/:id/contacts
   */
  static async addContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { contactIds } = req.body;
      
      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }
      
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        throw ApiError.badRequest('Contact IDs array is required');
      }
      
      const result = await ContactGroupService.addContacts(userId, id, contactIds);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove contacts from a group
   * @route DELETE /api/contacts/groups/:id/contacts
   */
  static async removeContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { contactIds } = req.body;
      
      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }
      
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        throw ApiError.badRequest('Contact IDs array is required');
      }
      
      const result = await ContactGroupService.removeContacts(userId, id, contactIds);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
