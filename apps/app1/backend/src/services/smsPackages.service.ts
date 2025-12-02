import { PrismaClient } from '@prisma/client';
import { ApiError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export interface CreateSmsPackageParams {
  name: string;
  description?: string;
  credits: number;
  price: number;
  currency?: string;
  isPopular?: boolean;
}

export interface PurchasePackageParams {
  userId: string;
  packageId: string;
  paymentMethod: string;
  paymentReference?: string;
}

export class SmsPackagesService {
  /**
   * Get all active SMS packages
   */
  static async getActivePackages() {
    try {
      const packages = await prisma.smsPackage.findMany({
        where: { isActive: true },
        orderBy: [
          { isPopular: 'desc' },
          { price: 'asc' }
        ]
      });

      return packages;
    } catch (error) {
      console.error('Get Active Packages Error:', error);
      throw ApiError.internal('Failed to get SMS packages');
    }
  }

  /**
   * Get package by ID
   */
  static async getPackageById(packageId: string) {
    try {
      const package_ = await prisma.smsPackage.findUnique({
        where: { id: packageId }
      });

      if (!package_) {
        throw ApiError.notFound('SMS package not found');
      }

      return package_;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Get Package By ID Error:', error);
      throw ApiError.internal('Failed to get SMS package');
    }
  }

  /**
   * Create SMS package (Admin only)
   */
  static async createPackage(params: CreateSmsPackageParams) {
    try {
      const {
        name,
        description,
        credits,
        price,
        currency = 'GHS',
        isPopular = false
      } = params;

      // Validate inputs
      if (credits <= 0) {
        throw ApiError.badRequest('Credits must be greater than 0');
      }

      if (price <= 0) {
        throw ApiError.badRequest('Price must be greater than 0');
      }

      // Check for duplicate name
      const existingPackage = await prisma.smsPackage.findUnique({
        where: { name }
      });

      if (existingPackage) {
        throw ApiError.conflict('Package with this name already exists');
      }

      const package_ = await prisma.smsPackage.create({
        data: {
          name,
          description,
          credits,
          price,
          currency,
          isPopular
        }
      });

      return package_;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Create Package Error:', error);
      throw ApiError.internal('Failed to create SMS package');
    }
  }

  /**
   * Purchase package and add credits to user wallet
   */
  static async purchasePackage(params: PurchasePackageParams) {
    try {
      const { userId, packageId, paymentMethod, paymentReference } = params;

      // Get package details
      const package_ = await this.getPackageById(packageId);

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Create purchase record and update user wallet in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create purchase record
        const purchase = await tx.packagePurchase.create({
          data: {
            userId,
            packageId,
            creditsReceived: package_.credits,
            amountPaid: package_.price,
            currency: package_.currency,
            paymentMethod,
            paymentReference,
            status: 'COMPLETED'
          }
        });

        // Add credits to user wallet
        await tx.user.update({
          where: { id: userId },
          data: {
            walletBalance: {
              increment: package_.credits
            }
          }
        });

        // Create wallet transaction record
        await tx.walletTransaction.create({
          data: {
            userId,
            type: 'CREDIT',
            amount: package_.credits,
            description: `SMS credits from ${package_.name} package`,
            reference: paymentReference || purchase.id,
            metadata: {
              packageId,
              packageName: package_.name,
              purchaseId: purchase.id
            }
          }
        });

        return purchase;
      });

      return result;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Purchase Package Error:', error);
      throw ApiError.internal('Failed to purchase SMS package');
    }
  }

  /**
   * Get user's purchase history
   */
  static async getUserPurchases(userId: string, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const [purchases, total] = await Promise.all([
        prisma.packagePurchase.findMany({
          where: { userId },
          include: {
            package: {
              select: {
                name: true,
                description: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.packagePurchase.count({
          where: { userId }
        })
      ]);

      return {
        purchases,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get User Purchases Error:', error);
      throw ApiError.internal('Failed to get purchase history');
    }
  }

  /**
   * Get user's current SMS balance
   */
  static async getUserBalance(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true }
      });

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      return { balance: user.walletBalance };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Get User Balance Error:', error);
      throw ApiError.internal('Failed to get user balance');
    }
  }

  /**
   * Update package (Admin only)
   */
  static async updatePackage(packageId: string, updates: Partial<CreateSmsPackageParams>) {
    try {
      const package_ = await prisma.smsPackage.update({
        where: { id: packageId },
        data: updates
      });

      return package_;
    } catch (error) {
      console.error('Update Package Error:', error);
      throw ApiError.internal('Failed to update SMS package');
    }
  }

  /**
   * Delete package (Admin only)
   */
  static async deletePackage(packageId: string) {
    try {
      await prisma.smsPackage.update({
        where: { id: packageId },
        data: { isActive: false }
      });

      return { success: true };
    } catch (error) {
      console.error('Delete Package Error:', error);
      throw ApiError.internal('Failed to delete SMS package');
    }
  }
}
