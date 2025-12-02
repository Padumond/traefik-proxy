import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/apiKey.service';
import { ApiError } from '../middleware/error.middleware';

export class ApiKeyController {
  /**
   * Create a new API key
   */
  static async createApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { name, permissions, ipWhitelist, rateLimit, expiresAt } = req.body;

      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }

      if (!name || name.trim().length === 0) {
        throw ApiError.badRequest('API key name is required');
      }

      if (name.length > 100) {
        throw ApiError.badRequest('API key name must be less than 100 characters');
      }

      // Validate permissions if provided
      if (permissions && Array.isArray(permissions)) {
        const availablePermissions = ApiKeyService.getAvailablePermissions();
        const invalidPermissions = permissions.filter(
          (perm: string) => !availablePermissions.includes(perm) && perm !== '*'
        );
        
        if (invalidPermissions.length > 0) {
          throw ApiError.badRequest(
            `Invalid permissions: ${invalidPermissions.join(', ')}`
          );
        }
      }

      // Validate IP whitelist if provided
      if (ipWhitelist && Array.isArray(ipWhitelist)) {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const invalidIps = ipWhitelist.filter((ip: string) => !ipRegex.test(ip));
        
        if (invalidIps.length > 0) {
          throw ApiError.badRequest(
            `Invalid IP addresses: ${invalidIps.join(', ')}`
          );
        }
      }

      // Validate rate limit
      if (rateLimit && (rateLimit < 1 || rateLimit > 10000)) {
        throw ApiError.badRequest('Rate limit must be between 1 and 10000 requests per hour');
      }

      // Validate expiration date
      if (expiresAt && new Date(expiresAt) <= new Date()) {
        throw ApiError.badRequest('Expiration date must be in the future');
      }

      const result = await ApiKeyService.createApiKey({
        userId,
        name: name.trim(),
        permissions,
        ipWhitelist,
        rateLimit,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      res.status(201).json({
        success: true,
        message: 'API key created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all API keys for the authenticated user
   */
  static async getUserApiKeys(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }

      const apiKeys = await ApiKeyService.getUserApiKeys(userId);

      res.json({
        success: true,
        message: 'API keys retrieved successfully',
        data: apiKeys,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific API key by ID
   */
  static async getApiKeyById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }

      if (!id) {
        throw ApiError.badRequest('API key ID is required');
      }

      const apiKey = await ApiKeyService.getApiKeyById(id, userId);

      res.json({
        success: true,
        message: 'API key retrieved successfully',
        data: apiKey,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an API key
   */
  static async updateApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { name, permissions, ipWhitelist, rateLimit, isActive, expiresAt } = req.body;

      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }

      if (!id) {
        throw ApiError.badRequest('API key ID is required');
      }

      const updates: any = {};

      if (name !== undefined) {
        if (!name || name.trim().length === 0) {
          throw ApiError.badRequest('API key name cannot be empty');
        }
        if (name.length > 100) {
          throw ApiError.badRequest('API key name must be less than 100 characters');
        }
        updates.name = name.trim();
      }

      if (permissions !== undefined) {
        if (Array.isArray(permissions)) {
          const availablePermissions = ApiKeyService.getAvailablePermissions();
          const invalidPermissions = permissions.filter(
            (perm: string) => !availablePermissions.includes(perm) && perm !== '*'
          );
          
          if (invalidPermissions.length > 0) {
            throw ApiError.badRequest(
              `Invalid permissions: ${invalidPermissions.join(', ')}`
            );
          }
          updates.permissions = permissions;
        } else {
          throw ApiError.badRequest('Permissions must be an array');
        }
      }

      if (ipWhitelist !== undefined) {
        if (Array.isArray(ipWhitelist)) {
          const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const invalidIps = ipWhitelist.filter((ip: string) => !ipRegex.test(ip));
          
          if (invalidIps.length > 0) {
            throw ApiError.badRequest(
              `Invalid IP addresses: ${invalidIps.join(', ')}`
            );
          }
          updates.ipWhitelist = ipWhitelist;
        } else {
          throw ApiError.badRequest('IP whitelist must be an array');
        }
      }

      if (rateLimit !== undefined) {
        if (rateLimit < 1 || rateLimit > 10000) {
          throw ApiError.badRequest('Rate limit must be between 1 and 10000 requests per hour');
        }
        updates.rateLimit = rateLimit;
      }

      if (isActive !== undefined) {
        updates.isActive = Boolean(isActive);
      }

      if (expiresAt !== undefined) {
        if (expiresAt === null) {
          updates.expiresAt = null;
        } else {
          const expDate = new Date(expiresAt);
          if (expDate <= new Date()) {
            throw ApiError.badRequest('Expiration date must be in the future');
          }
          updates.expiresAt = expDate;
        }
      }

      const result = await ApiKeyService.updateApiKey(id, userId, updates);

      res.json({
        success: true,
        message: 'API key updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an API key
   */
  static async deleteApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }

      if (!id) {
        throw ApiError.badRequest('API key ID is required');
      }

      await ApiKeyService.deleteApiKey(id, userId);

      res.json({
        success: true,
        message: 'API key deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Regenerate an API key
   */
  static async regenerateApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }

      if (!id) {
        throw ApiError.badRequest('API key ID is required');
      }

      const result = await ApiKeyService.regenerateApiKey(id, userId);

      res.json({
        success: true,
        message: 'API key regenerated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API key usage statistics
   */
  static async getApiKeyUsageStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }

      if (!id) {
        throw ApiError.badRequest('API key ID is required');
      }

      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate) {
        start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          throw ApiError.badRequest('Invalid start date format');
        }
      }

      if (endDate) {
        end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          throw ApiError.badRequest('Invalid end date format');
        }
      }

      if (start && end && start > end) {
        throw ApiError.badRequest('Start date must be before end date');
      }

      const stats = await ApiKeyService.getApiKeyUsageStats(id, userId, start, end);

      res.json({
        success: true,
        message: 'Usage statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available permissions
   */
  static async getAvailablePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const permissions = ApiKeyService.getAvailablePermissions();

      res.json({
        success: true,
        message: 'Available permissions retrieved successfully',
        data: permissions,
      });
    } catch (error) {
      next(error);
    }
  }
}
