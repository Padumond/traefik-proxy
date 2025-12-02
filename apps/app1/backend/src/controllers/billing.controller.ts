import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billing.service';
import { ApiError } from '../middleware/error.middleware';

export class BillingController {
  /**
   * Get billing configuration
   */
  static async getBillingConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;

      const config = await BillingService.getBillingConfig(userId);

      res.status(200).json({
        success: true,
        message: 'Billing configuration retrieved successfully',
        data: config
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get billing configuration'
      });
    }
  }

  /**
   * Update billing configuration
   */
  static async updateBillingConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const {
        billingCycle,
        creditLimit,
        autoRecharge,
        autoRechargeAmount,
        autoRechargeThreshold,
        paymentTerms,
        invoicePrefix
      } = req.body;

      if (!billingCycle) {
        return res.status(400).json({
          success: false,
          message: 'Billing cycle is required'
        });
      }

      const config = await BillingService.createOrUpdateBillingConfig({
        userId,
        billingCycle,
        creditLimit,
        autoRecharge,
        autoRechargeAmount,
        autoRechargeThreshold,
        paymentTerms,
        invoicePrefix
      });

      res.status(200).json({
        success: true,
        message: 'Billing configuration updated successfully',
        data: config
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
          message: 'Failed to update billing configuration'
        });
      }
    }
  }

  /**
   * Create invoice
   */
  static async createInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { lineItems, notes, dueDate } = req.body;

      if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Line items are required'
        });
      }

      // Validate line items
      for (const item of lineItems) {
        if (!item.description || !item.quantity || !item.unitPrice) {
          return res.status(400).json({
            success: false,
            message: 'Each line item must have description, quantity, and unitPrice'
          });
        }
      }

      const invoice = await BillingService.createInvoice({
        userId,
        lineItems,
        notes,
        dueDate: dueDate ? new Date(dueDate) : undefined
      });

      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        data: invoice
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
          message: 'Failed to create invoice'
        });
      }
    }
  }

  /**
   * Get invoices
   */
  static async getInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { status, page, limit } = req.query;

      const result = await BillingService.getInvoices(
        userId,
        status as any,
        page ? parseInt(page as string) : 1,
        limit ? parseInt(limit as string) : 20
      );

      res.status(200).json({
        success: true,
        message: 'Invoices retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get invoices'
      });
    }
  }

  /**
   * Mark invoice as paid
   */
  static async markInvoicePaid(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { id } = req.params;
      const { paidDate } = req.body;

      const invoice = await BillingService.markInvoicePaid(
        id,
        userId,
        paidDate ? new Date(paidDate) : undefined
      );

      res.status(200).json({
        success: true,
        message: 'Invoice marked as paid successfully',
        data: invoice
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
          message: 'Failed to mark invoice as paid'
        });
      }
    }
  }

  /**
   * Get credit balance
   */
  static async getCreditBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;

      const balance = await BillingService.getCreditBalance(userId);

      res.status(200).json({
        success: true,
        message: 'Credit balance retrieved successfully',
        data: {
          balance,
          currency: 'USD'
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get credit balance'
      });
    }
  }

  /**
   * Add credit
   */
  static async addCredit(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { amount, description, referenceId } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      if (!description) {
        return res.status(400).json({
          success: false,
          message: 'Description is required'
        });
      }

      const transaction = await BillingService.recordCreditTransaction({
        userId,
        type: 'PURCHASE',
        amount,
        description,
        referenceId
      });

      res.status(200).json({
        success: true,
        message: 'Credit added successfully',
        data: transaction
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
          message: 'Failed to add credit'
        });
      }
    }
  }

  /**
   * Get credit transactions
   */
  static async getCreditTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { page, limit } = req.query;

      const result = await BillingService.getCreditTransactions(
        userId,
        page ? parseInt(page as string) : 1,
        limit ? parseInt(limit as string) : 20
      );

      res.status(200).json({
        success: true,
        message: 'Credit transactions retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get credit transactions'
      });
    }
  }

  /**
   * Generate monthly invoice
   */
  static async generateMonthlyInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { month, year } = req.body;

      if (!month || !year) {
        return res.status(400).json({
          success: false,
          message: 'Month and year are required'
        });
      }

      if (month < 1 || month > 12) {
        return res.status(400).json({
          success: false,
          message: 'Month must be between 1 and 12'
        });
      }

      const invoice = await BillingService.generateMonthlyInvoice(userId, month, year);

      res.status(201).json({
        success: true,
        message: 'Monthly invoice generated successfully',
        data: invoice
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
          message: 'Failed to generate monthly invoice'
        });
      }
    }
  }

  /**
   * Get billing analytics
   */
  static async getBillingAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { days = 30 } = req.query;

      const analytics = await BillingService.getBillingAnalytics(
        userId,
        parseInt(days as string)
      );

      res.status(200).json({
        success: true,
        message: 'Billing analytics retrieved successfully',
        data: analytics
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get billing analytics'
      });
    }
  }

  /**
   * Get billing summary
   */
  static async getBillingSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;

      const [config, balance, analytics] = await Promise.all([
        BillingService.getBillingConfig(userId),
        BillingService.getCreditBalance(userId),
        BillingService.getBillingAnalytics(userId, 30)
      ]);

      res.status(200).json({
        success: true,
        message: 'Billing summary retrieved successfully',
        data: {
          config: {
            billingCycle: config.billingCycle,
            creditLimit: config.creditLimit,
            autoRecharge: config.autoRecharge,
            autoRechargeAmount: config.autoRechargeAmount,
            autoRechargeThreshold: config.autoRechargeThreshold
          },
          currentBalance: balance,
          analytics
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get billing summary'
      });
    }
  }
}
