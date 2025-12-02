import multer from "multer";
import { Request } from "express";
import { ApiError } from "./error.middleware";

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Enhanced file filter function with security checks
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Allowed MIME types
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed!"));
  }

  // Check file extension
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const fileExtension = file.originalname
    .toLowerCase()
    .substring(file.originalname.lastIndexOf("."));

  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new Error("Invalid file extension!"));
  }

  // Additional security: Check for suspicious filenames
  const suspiciousPatterns = [
    /\.php$/i,
    /\.asp$/i,
    /\.jsp$/i,
    /\.js$/i,
    /\.html$/i,
    /\.htm$/i,
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.com$/i,
    /\.pif$/i,
  ];

  if (suspiciousPatterns.some((pattern) => pattern.test(file.originalname))) {
    return cb(new Error("Suspicious file type detected!"));
  }

  cb(null, true);
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware for single file upload
export const uploadSingle = (fieldName: string) => {
  return upload.single(fieldName);
};

// Middleware for multiple file upload
export const uploadMultiple = (fieldName: string, maxCount: number) => {
  return upload.array(fieldName, maxCount);
};

// Avatar upload middleware
export const uploadAvatar = uploadSingle("avatar");

export default upload;
