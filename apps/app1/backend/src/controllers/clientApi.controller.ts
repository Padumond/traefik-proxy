import { Request, Response, NextFunction } from 'express';
import { ClientApiService } from '../services/clientApi.service';
import { ApiError } from '../middleware/error.middleware';

export class ClientApiController {
  /**
   * Create a new client API route
   */
  static async createClientApi(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { route, mappedTo, rateLimit } = req.body;

      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }

      if (!route || !mappedTo) {
        throw ApiError.badRequest('Route and mappedTo are required');
      }

      const result = await ClientApiService.createClientApi({
        userId,
        route,
        mappedTo,
        rateLimit
      });

      res.status(201).json({
        success: true,
        message: 'Client API route created successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all client API routes for a user
   */
  static async getClientApis(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { page, limit } = req.query;

      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }

      const result = await ClientApiService.getClientApis(userId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update client API route
   */
  static async updateClientApi(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { route, mappedTo, rateLimit } = req.body;

      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }

      // Ensure at least one field is provided
      if (!route && !mappedTo && !rateLimit) {
        throw ApiError.badRequest('At least one field must be provided');
      }

      const result = await ClientApiService.updateClientApi(id, userId, {
        route,
        mappedTo,
        rateLimit
      });

      res.status(200).json({
        success: true,
        message: 'Client API route updated successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete client API route
   */
  static async deleteClientApi(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        throw ApiError.unauthorized('Not authenticated');
      }

      const result = await ClientApiService.deleteClientApi(id, userId);

      res.status(200).json({
        success: true,
        message: 'Client API route deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle client API requests
   * This is used by the API Gateway to route requests
   */
  static async handleClientApiRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { route } = req.params;
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        throw ApiError.unauthorized('API key is required');
      }

      // Resolve client API route
      const resolvedRoute = await ClientApiService.resolveClientApiRoute(
        `/${route}`,
        apiKey
      );

      // Add resolved route info to request for downstream handlers
      // Using type assertion to avoid TypeScript error
      (req as any).clientApiInfo = {
        userId: resolvedRoute.userId,
        mappedTo: resolvedRoute.mappedTo,
        rateLimit: resolvedRoute.rateLimit
      };

      // Forward to next middleware/controller
      next();
    } catch (error) {
      next(error);
    }
  }
}
