import { PrismaClient } from '@prisma/client';
import { ApiError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

interface CreateClientApiParams {
  userId: string;
  route: string;
  mappedTo: string;
  rateLimit?: number;
}

export class ClientApiService {
  /**
   * Create a new client API route
   */
  static async createClientApi({
    userId,
    route,
    mappedTo,
    rateLimit = 100
  }: CreateClientApiParams) {
    try {
      // Validate route format
      if (!this.isValidRoute(route)) {
        throw ApiError.badRequest(
          'Invalid route format. Route must start with /'
        );
      }

      // Validate mapped route
      if (!this.isValidMappedRoute(mappedTo)) {
        throw ApiError.badRequest(
          'Invalid mapped route. Mapped route must be an internal route'
        );
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Only clients can create API routes
      if (user.role !== 'CLIENT') {
        throw ApiError.badRequest('Only client users can create API routes');
      }

      // Check if this route is already registered by this user
      const existingRoute = await prisma.clientApi.findFirst({
        where: {
          userId,
          route
        }
      });

      if (existingRoute) {
        throw ApiError.conflict('You have already registered this route');
      }

      // Create client API route
      const clientApi = await prisma.clientApi.create({
        data: {
          userId,
          route,
          mappedTo,
          rateLimit
        }
      });

      return clientApi;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Client API Service Error:', error);
      throw ApiError.internal('Failed to create client API route');
    }
  }

  /**
   * Get all client API routes for a user
   */
  static async getClientApis(
    userId: string,
    filters: {
      page?: number;
      limit?: number;
    } = {}
  ) {
    try {
      const { page = 1, limit = 10 } = filters;
      const skip = (page - 1) * limit;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Get total count for pagination
      const totalCount = await prisma.clientApi.count({
        where: { userId }
      });

      // Get client API routes
      const clientApis = await prisma.clientApi.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      });

      return {
        data: clientApis,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Client API Service Error:', error);
      throw ApiError.internal('Failed to get client API routes');
    }
  }

  /**
   * Update client API route
   */
  static async updateClientApi(
    id: string,
    userId: string,
    data: {
      route?: string;
      mappedTo?: string;
      rateLimit?: number;
    }
  ) {
    try {
      // Check if client API route exists
      const clientApi = await prisma.clientApi.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!clientApi) {
        throw ApiError.notFound('Client API route not found');
      }

      // Prepare update data
      const updateData: any = {};

      if (data.route) {
        // Validate route format
        if (!this.isValidRoute(data.route)) {
          throw ApiError.badRequest(
            'Invalid route format. Route must start with /'
          );
        }

        // Check if this route is already registered by this user
        const existingRoute = await prisma.clientApi.findFirst({
          where: {
            userId,
            route: data.route,
            id: { not: id }
          }
        });

        if (existingRoute) {
          throw ApiError.conflict('You have already registered this route');
        }

        updateData.route = data.route;
      }

      if (data.mappedTo) {
        // Validate mapped route
        if (!this.isValidMappedRoute(data.mappedTo)) {
          throw ApiError.badRequest(
            'Invalid mapped route. Mapped route must be an internal route'
          );
        }

        updateData.mappedTo = data.mappedTo;
      }

      if (data.rateLimit) {
        updateData.rateLimit = data.rateLimit;
      }

      // Update client API route
      const updatedClientApi = await prisma.clientApi.update({
        where: { id },
        data: updateData
      });

      return updatedClientApi;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Client API Service Error:', error);
      throw ApiError.internal('Failed to update client API route');
    }
  }

  /**
   * Delete client API route
   */
  static async deleteClientApi(id: string, userId: string) {
    try {
      // Check if client API route exists
      const clientApi = await prisma.clientApi.findFirst({
        where: {
          id,
          userId
        }
      });

      if (!clientApi) {
        throw ApiError.notFound('Client API route not found');
      }

      // Delete client API route
      await prisma.clientApi.delete({
        where: { id }
      });

      return { success: true, message: 'Client API route deleted successfully' };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Client API Service Error:', error);
      throw ApiError.internal('Failed to delete client API route');
    }
  }

  /**
   * Resolve client API route to internal route
   * This is used by the API Gateway to route requests
   */
  static async resolveClientApiRoute(
    route: string,
    apiKey: string
  ) {
    try {
      // Find the user by API key
      const user = await prisma.user.findUnique({
        where: { apiKey }
      });

      if (!user) {
        throw ApiError.unauthorized('Invalid API key');
      }

      // Find the client API route
      const clientApi = await prisma.clientApi.findFirst({
        where: {
          userId: user.id,
          route
        }
      });

      if (!clientApi) {
        throw ApiError.notFound('API route not found');
      }

      return {
        userId: user.id,
        mappedTo: clientApi.mappedTo,
        rateLimit: clientApi.rateLimit
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Client API Service Error:', error);
      throw ApiError.internal('Failed to resolve client API route');
    }
  }

  /**
   * Validate route format
   * Route must start with /
   */
  private static isValidRoute(route: string): boolean {
    return route.startsWith('/');
  }

  /**
   * Validate mapped route
   * Mapped route must be an internal route
   */
  private static isValidMappedRoute(mappedTo: string): boolean {
    // List of allowed internal routes
    const allowedRoutes = [
      '/api/sms/send',
      '/api/sms/status',
      '/api/sms/logs',
      '/api/wallet/balance',
      '/api/sender-ids'
    ];

    return allowedRoutes.includes(mappedTo);
  }
}
