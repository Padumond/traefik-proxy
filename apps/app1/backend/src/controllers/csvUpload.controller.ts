import { Request, Response, NextFunction } from 'express';
import { CsvUploadService } from '../services/csvUpload.service';
import { ApiError } from '../middleware/error.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `contacts-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Accept only CSV files
  if (file.mimetype === 'text/csv' || 
      file.mimetype === 'application/csv' ||
      file.originalname.toLowerCase().endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new ApiError('Only CSV files are allowed', 400), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export class CsvUploadController {
  /**
   * Upload and preview CSV file
   */
  static async previewCsvUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'CSV file is required'
        });
      }

      const filePath = req.file.path;

      // Validate file
      const validation = CsvUploadService.validateCsvFile(filePath);
      if (!validation.valid) {
        // Clean up file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }

      // Parse and preview CSV
      const result = await CsvUploadService.processUploadedFile(filePath, userId, undefined, true);

      res.status(200).json({
        success: true,
        message: 'CSV file parsed successfully',
        data: {
          totalRows: result.totalRows,
          validRows: result.validRows,
          invalidRows: result.invalidRows,
          errors: result.errors.slice(0, 10), // Show first 10 errors
          preview: result.preview,
          filename: req.file.originalname
        }
      });
    } catch (error: any) {
      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      if (error instanceof ApiError) {
        res.status(error.statusCode || 400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to process CSV file'
        });
      }
    }
  }

  /**
   * Upload and import CSV file
   */
  static async importCsvContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { groupId } = req.body;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'CSV file is required'
        });
      }

      const filePath = req.file.path;

      // Validate file
      const validation = CsvUploadService.validateCsvFile(filePath);
      if (!validation.valid) {
        // Clean up file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }

      // Process and import CSV
      const result = await CsvUploadService.processUploadedFile(filePath, userId, groupId, false);

      res.status(200).json({
        success: true,
        message: 'CSV import completed',
        data: {
          totalRows: result.totalRows,
          validRows: result.validRows,
          invalidRows: result.invalidRows,
          created: result.created,
          skipped: result.skipped,
          errors: result.errors,
          filename: req.file.originalname
        }
      });
    } catch (error: any) {
      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      if (error instanceof ApiError) {
        res.status(error.statusCode || 400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to import CSV file'
        });
      }
    }
  }

  /**
   * Download CSV template
   */
  static async downloadCsvTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const template = CsvUploadService.generateCsvTemplate();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="contacts_template.csv"');
      res.status(200).send(template);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate CSV template'
      });
    }
  }

  /**
   * Get upload statistics
   */
  static async getUploadStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;

      const stats = await CsvUploadService.getUploadStats(userId);

      res.status(200).json({
        success: true,
        message: 'Upload statistics retrieved successfully',
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get upload statistics'
      });
    }
  }

  /**
   * Validate CSV format without uploading
   */
  static async validateCsvFormat(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'CSV file is required'
        });
      }

      const filePath = req.file.path;
      const validation = CsvUploadService.validateCsvFile(filePath);

      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.status(200).json({
        success: validation.valid,
        message: validation.valid ? 'CSV format is valid' : validation.error,
        data: {
          valid: validation.valid,
          error: validation.error
        }
      });
    } catch (error: any) {
      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Failed to validate CSV format'
      });
    }
  }

  /**
   * Get supported CSV columns
   */
  static async getSupportedColumns(req: Request, res: Response, next: NextFunction) {
    try {
      const supportedColumns = {
        required: [
          { name: 'name', description: 'Full name of the contact (required if firstName and lastName not provided)' },
          { name: 'phone', description: 'Phone number (required)' }
        ],
        optional: [
          { name: 'firstName', description: 'First name of the contact' },
          { name: 'lastName', description: 'Last name of the contact' },
          { name: 'email', description: 'Email address' },
          { name: 'tags', description: 'Comma-separated tags' },
          { name: 'company', description: 'Company name' },
          { name: 'position', description: 'Job position' }
        ],
        notes: [
          'Column names are case-insensitive',
          'Phone numbers should include country code (e.g., +233123456789)',
          'Any additional columns will be stored as custom fields',
          'Maximum file size: 10MB',
          'Supported formats: CSV'
        ]
      };

      res.status(200).json({
        success: true,
        message: 'Supported CSV columns retrieved successfully',
        data: supportedColumns
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get supported columns'
      });
    }
  }

  /**
   * Bulk import with progress tracking
   */
  static async bulkImportWithProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = (req as any).user;
      const { groupId, batchSize = 50 } = req.body;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'CSV file is required'
        });
      }

      // For now, we'll process immediately
      // In a production environment, this would be queued for background processing
      const result = await CsvUploadService.processUploadedFile(
        req.file.path, 
        userId, 
        groupId, 
        false
      );

      res.status(200).json({
        success: true,
        message: 'Bulk import completed',
        data: {
          ...result,
          progress: 100,
          status: 'completed'
        }
      });
    } catch (error: any) {
      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      if (error instanceof ApiError) {
        res.status(error.statusCode || 400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to process bulk import'
        });
      }
    }
  }
}
