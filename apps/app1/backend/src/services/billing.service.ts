import { PrismaClient, BillingCycle, InvoiceStatus } from '@prisma/client';
import { ApiError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

interface CreateBillingConfigParams {
  userId: string;
  billingCycle: BillingCycle;
  creditLimit?: number;
  autoRecharge?: boolean;
  autoRechargeAmount?: number;
  autoRechargeThreshold?: number;
  paymentTerms?: number;
  invoicePrefix?: string;
}

interface CreateInvoiceParams {
  userId: string;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    metadata?: any;
  }[];
  notes?: string;
  dueDate?: Date;
}

export class BillingService {
  /**
   * Create or update billing configuration
   */
  static async createOrUpdateBillingConfig(params: CreateBillingConfigParams) {
    try {
      const {
        userId,
        billingCycle,
        creditLimit = 0,
        autoRecharge = false,
        autoRechargeAmount = 0,
        autoRechargeThreshold = 0,
        paymentTerms = 30,
        invoicePrefix = 'INV'
      } = params;

      const billingConfig = await prisma.billingConfig.upsert({
        where: { userId },
        update: {
          billingCycle,
          creditLimit,
          autoRecharge,
          autoRechargeAmount,
          autoRechargeThreshold,
          paymentTerms,
          invoicePrefix
        },
        create: {
          userId,
          billingCycle,
          creditLimit,
          autoRecharge,
          autoRechargeAmount,
          autoRechargeThreshold,
          paymentTerms,
          invoicePrefix
        }
      });

      return billingConfig;
    } catch (error) {
      console.error('Billing Config Error:', error);
      throw ApiError.internal('Failed to create billing configuration');
    }
  }

  /**
   * Get billing configuration
   */
  static async getBillingConfig(userId: string) {
    try {
      const config = await prisma.billingConfig.findUnique({
        where: { userId }
      });

      if (!config) {
        // Create default config if none exists
        return await this.createOrUpdateBillingConfig({
          userId,
          billingCycle: 'PREPAID'
        });
      }

      return config;
    } catch (error) {
      console.error('Get Billing Config Error:', error);
      throw ApiError.internal('Failed to get billing configuration');
    }
  }

  /**
   * Create invoice
   */
  static async createInvoice(params: CreateInvoiceParams) {
    try {
      const { userId, lineItems, notes, dueDate } = params;

      // Get billing config
      const billingConfig = await this.getBillingConfig(userId);

      // Calculate totals
      const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const taxAmount = 0; // TODO: Implement tax calculation
      const totalAmount = subtotal + taxAmount;

      // Generate invoice number
      const invoiceNumber = `${billingConfig.invoicePrefix}-${String(billingConfig.nextInvoiceNumber).padStart(6, '0')}`;

      // Calculate due date
      const calculatedDueDate = dueDate || new Date();
      if (!dueDate) {
        calculatedDueDate.setDate(calculatedDueDate.getDate() + billingConfig.paymentTerms);
      }

      // Create invoice with line items
      const invoice = await prisma.invoice.create({
        data: {
          userId,
          billingConfigId: billingConfig.id,
          invoiceNumber,
          dueDate: calculatedDueDate,
          subtotal,
          taxAmount,
          totalAmount,
          notes,
          lineItems: {
            create: lineItems.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              metadata: item.metadata
            }))
          }
        },
        include: {
          lineItems: true
        }
      });

      // Update next invoice number
      await prisma.billingConfig.update({
        where: { id: billingConfig.id },
        data: {
          nextInvoiceNumber: billingConfig.nextInvoiceNumber + 1
        }
      });

      return invoice;
    } catch (error) {
      console.error('Create Invoice Error:', error);
      throw ApiError.internal('Failed to create invoice');
    }
  }

  /**
   * Get invoices for user
   */
  static async getInvoices(userId: string, status?: InvoiceStatus, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const where: any = { userId };
      
      if (status) {
        where.status = status;
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            lineItems: true
          }
        }),
        prisma.invoice.count({ where })
      ]);

      return {
        data: invoices,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get Invoices Error:', error);
      throw ApiError.internal('Failed to get invoices');
    }
  }

  /**
   * Mark invoice as paid
   */
  static async markInvoicePaid(invoiceId: string, userId: string, paidDate?: Date) {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          userId
        }
      });

      if (!invoice) {
        throw ApiError.notFound('Invoice not found');
      }

      if (invoice.status === 'PAID') {
        throw ApiError.badRequest('Invoice is already paid');
      }

      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          paidDate: paidDate || new Date()
        },
        include: {
          lineItems: true
        }
      });

      return updatedInvoice;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Mark Invoice Paid Error:', error);
      throw ApiError.internal('Failed to mark invoice as paid');
    }
  }

  /**
   * Record credit transaction
   */
  static async recordCreditTransaction(params: {
    userId: string;
    type: string;
    amount: number;
    description: string;
    referenceId?: string;
    metadata?: any;
  }) {
    try {
      // Get current balance
      const lastTransaction = await prisma.creditTransaction.findFirst({
        where: { userId: params.userId },
        orderBy: { createdAt: 'desc' }
      });

      const currentBalance = lastTransaction?.balance || 0;
      const newBalance = currentBalance + params.amount;

      const transaction = await prisma.creditTransaction.create({
        data: {
          userId: params.userId,
          type: params.type,
          amount: params.amount,
          balance: newBalance,
          description: params.description,
          referenceId: params.referenceId,
          metadata: params.metadata
        }
      });

      // Check auto-recharge if balance is low
      if (params.type === 'USAGE' && newBalance > 0) {
        await this.checkAutoRecharge(params.userId, newBalance);
      }

      return transaction;
    } catch (error) {
      console.error('Record Credit Transaction Error:', error);
      throw ApiError.internal('Failed to record credit transaction');
    }
  }

  /**
   * Get credit balance
   */
  static async getCreditBalance(userId: string) {
    try {
      const lastTransaction = await prisma.creditTransaction.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      return lastTransaction?.balance || 0;
    } catch (error) {
      console.error('Get Credit Balance Error:', error);
      throw ApiError.internal('Failed to get credit balance');
    }
  }

  /**
   * Get credit transaction history
   */
  static async getCreditTransactions(userId: string, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        prisma.creditTransaction.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.creditTransaction.count({ where: { userId } })
      ]);

      return {
        data: transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get Credit Transactions Error:', error);
      throw ApiError.internal('Failed to get credit transactions');
    }
  }

  /**
   * Generate monthly invoice for postpaid users
   */
  static async generateMonthlyInvoice(userId: string, month: number, year: number) {
    try {
      const billingConfig = await this.getBillingConfig(userId);

      if (billingConfig.billingCycle === 'PREPAID') {
        throw ApiError.badRequest('User is on prepaid billing');
      }

      // Get profit transactions for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const profitTransactions = await prisma.profitTransaction.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      if (profitTransactions.length === 0) {
        throw ApiError.badRequest('No transactions found for this period');
      }

      // Group transactions by type
      const groupedTransactions = profitTransactions.reduce((acc, transaction) => {
        const key = transaction.transactionType;
        if (!acc[key]) {
          acc[key] = {
            count: 0,
            totalCost: 0,
            volume: 0
          };
        }
        acc[key].count++;
        acc[key].totalCost += transaction.clientCharge;
        acc[key].volume += transaction.volume;
        return acc;
      }, {} as any);

      // Create line items
      const lineItems = Object.entries(groupedTransactions).map(([type, data]: [string, any]) => ({
        description: `${type} Services - ${data.volume} SMS`,
        quantity: data.volume,
        unitPrice: data.totalCost / data.volume,
        metadata: {
          transactionType: type,
          period: `${year}-${String(month).padStart(2, '0')}`
        }
      }));

      const invoice = await this.createInvoice({
        userId,
        lineItems,
        notes: `Monthly invoice for ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
      });

      return invoice;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Generate Monthly Invoice Error:', error);
      throw ApiError.internal('Failed to generate monthly invoice');
    }
  }

  /**
   * Check and trigger auto-recharge if needed
   */
  private static async checkAutoRecharge(userId: string, currentBalance: number) {
    try {
      const billingConfig = await prisma.billingConfig.findUnique({
        where: { userId }
      });

      if (!billingConfig?.autoRecharge) {
        return;
      }

      if (currentBalance <= billingConfig.autoRechargeThreshold) {
        // Record auto-recharge transaction
        await this.recordCreditTransaction({
          userId,
          type: 'PURCHASE',
          amount: billingConfig.autoRechargeAmount,
          description: `Auto-recharge: $${billingConfig.autoRechargeAmount}`,
          metadata: {
            autoRecharge: true,
            threshold: billingConfig.autoRechargeThreshold
          }
        });

        // TODO: Integrate with payment processor for actual charging
        console.log(`Auto-recharge triggered for user ${userId}: $${billingConfig.autoRechargeAmount}`);
      }
    } catch (error) {
      console.error('Auto-recharge Error:', error);
      // Don't throw error to avoid breaking the main transaction
    }
  }

  /**
   * Get billing analytics
   */
  static async getBillingAnalytics(userId: string, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [totalRevenue, totalInvoices, paidInvoices, overdueInvoices] = await Promise.all([
        prisma.invoice.aggregate({
          where: {
            userId,
            createdAt: { gte: startDate }
          },
          _sum: { totalAmount: true }
        }),
        prisma.invoice.count({
          where: {
            userId,
            createdAt: { gte: startDate }
          }
        }),
        prisma.invoice.count({
          where: {
            userId,
            status: 'PAID',
            createdAt: { gte: startDate }
          }
        }),
        prisma.invoice.count({
          where: {
            userId,
            status: 'OVERDUE',
            createdAt: { gte: startDate }
          }
        })
      ]);

      const paymentRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;

      return {
        period: `${days} days`,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        totalInvoices,
        paidInvoices,
        overdueInvoices,
        paymentRate: Math.round(paymentRate * 100) / 100
      };
    } catch (error) {
      console.error('Billing Analytics Error:', error);
      throw ApiError.internal('Failed to get billing analytics');
    }
  }
}
