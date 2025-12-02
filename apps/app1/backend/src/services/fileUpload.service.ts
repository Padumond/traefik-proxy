import multer from "multer";
import path from "path";
import fs from "fs";
import { ApiError } from "../middleware/error.middleware";

// Allowed file types for sender ID consent forms
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
];

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export interface UploadedFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
}

export class FileUploadService {
  private static uploadDir = path.join(
    process.cwd(),
    "uploads",
    "sender-id-consents"
  );

  /**
   * Initialize upload directory
   */
  static init() {
    try {
      // Create upload directory if it doesn't exist
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
        console.log(`Created upload directory: ${this.uploadDir}`);
      }
    } catch (error) {
      console.error("Failed to create upload directory:", error);
      throw new Error("Failed to initialize file upload service");
    }
  }

  /**
   * Configure multer for file uploads
   */
  static getMulterConfig() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        // Generate unique filename with timestamp and random string
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = path.extname(file.originalname);
        const filename = `consent-${timestamp}-${randomString}${extension}`;
        cb(null, filename);
      },
    });

    const fileFilter = (
      req: any,
      file: Express.Multer.File,
      cb: multer.FileFilterCallback
    ) => {
      // Check file extension
      const extension = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return cb(
          new Error(
            `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(
              ", "
            )}`
          )
        );
      }

      // Check MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(
          new Error(`MIME type not allowed. File type: ${file.mimetype}`)
        );
      }

      cb(null, true);
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1, // Only allow one file per upload
      },
    });
  }

  /**
   * Validate uploaded file
   */
  static validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw ApiError.badRequest("No file uploaded");
    }

    // Double-check file size
    if (file.size > MAX_FILE_SIZE) {
      throw ApiError.badRequest(
        `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    // Validate file extension
    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw ApiError.badRequest(
        `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw ApiError.badRequest(`Invalid MIME type: ${file.mimetype}`);
    }
  }

  /**
   * Process uploaded file and return file info
   */
  static processUploadedFile(file: Express.Multer.File): UploadedFile {
    this.validateFile(file);

    return {
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
    };
  }

  /**
   * Delete uploaded file
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
      }
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
      // Don't throw error - file deletion failure shouldn't break the flow
    }
  }

  /**
   * Get file info without reading content
   */
  static getFileInfo(filePath: string): {
    exists: boolean;
    size?: number;
    mtime?: Date;
  } {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return {
          exists: true,
          size: stats.size,
          mtime: stats.mtime,
        };
      }
      return { exists: false };
    } catch (error) {
      console.error(`Failed to get file info for ${filePath}:`, error);
      return { exists: false };
    }
  }

  /**
   * Clean up old files (older than 30 days)
   */
  static async cleanupOldFiles(): Promise<void> {
    try {
      const files = fs.readdirSync(this.uploadDir);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old file: ${file}`);
        }
      }
    } catch (error) {
      console.error("Failed to cleanup old files:", error);
    }
  }

  /**
   * Get upload directory path
   */
  static getUploadDir(): string {
    return this.uploadDir;
  }

  /**
   * Get allowed file types info
   */
  static getAllowedFileTypes(): {
    extensions: string[];
    mimeTypes: string[];
    maxSize: number;
  } {
    return {
      extensions: ALLOWED_EXTENSIONS,
      mimeTypes: ALLOWED_MIME_TYPES,
      maxSize: MAX_FILE_SIZE,
    };
  }
}
