import { Request, Response, NextFunction } from "express";
const expressValidator = require("express-validator");
const { body, param, query, validationResult } = expressValidator;
import { ApiError } from "./error.middleware";
import DOMPurify from "isomorphic-dompurify";

/**
 * Middleware to handle validation errors from express-validator
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value,
    }));

    return next(
      ApiError.badRequest(
        `Validation failed: ${errorMessages.map((e) => e.message).join(", ")}`
      )
    );
  }

  next();
};

/**
 * Sanitize HTML content to prevent XSS
 */
export const sanitizeHtml = (value: string): string => {
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
};

/**
 * Custom validator for phone numbers
 * Supports both local Ghanaian format (0XXXXXXXXX) and international format (+233XXXXXXXXX)
 */
export const isValidPhoneNumber = (value: string): boolean => {
  // Remove any spaces, dashes, or parentheses
  const cleaned = value.replace(/[\s\-\(\)]/g, "");

  // Ghanaian phone number patterns:
  // 1. Local format: 0XXXXXXXXX (10 digits starting with 0)
  // 2. International format: +233XXXXXXXXX or 233XXXXXXXXX (12-13 digits)
  // 3. General international format: +[country code][number]

  // Check for Ghanaian local format (0XXXXXXXXX - 10 digits)
  if (/^0[2-9]\d{8}$/.test(cleaned)) {
    return true;
  }

  // Check for Ghanaian international format (+233XXXXXXXXX or 233XXXXXXXXX)
  if (/^(\+?233)[2-9]\d{8}$/.test(cleaned)) {
    return true;
  }

  // Check for general international format (+[1-9][4-14 more digits])
  if (/^\+[1-9]\d{4,14}$/.test(cleaned)) {
    return true;
  }

  // Check for other country codes without + (minimum 7 digits, maximum 15)
  if (/^[1-9]\d{6,14}$/.test(cleaned)) {
    return true;
  }

  return false;
};

/**
 * Custom validator for sender ID
 */
export const isValidSenderId = (value: string): boolean => {
  // Sender ID should be 3-11 characters, alphanumeric
  const senderIdRegex = /^[a-zA-Z0-9]{3,11}$/;
  return senderIdRegex.test(value);
};

/**
 * SMS validation rules
 */
export const validateSendSms = [
  body("senderId")
    .trim()
    .isLength({ min: 3, max: 11 })
    .withMessage("Sender ID must be 3-11 characters")
    .custom(isValidSenderId)
    .withMessage("Sender ID must be alphanumeric")
    .customSanitizer(sanitizeHtml),

  body("recipient")
    .trim()
    .custom(isValidPhoneNumber)
    .withMessage("Invalid phone number format")
    .customSanitizer(sanitizeHtml),

  body("message")
    .trim()
    .isLength({ min: 1, max: 1600 })
    .withMessage("Message must be 1-1600 characters")
    .customSanitizer(sanitizeHtml),

  handleValidationErrors,
];

/**
 * Bulk SMS validation rules
 */
export const validateBulkSms = [
  body("senderId")
    .trim()
    .isLength({ min: 3, max: 11 })
    .withMessage("Sender ID must be 3-11 characters")
    .custom(isValidSenderId)
    .withMessage("Sender ID must be alphanumeric")
    .customSanitizer(sanitizeHtml),

  body("recipients")
    .isArray({ min: 1, max: 1000 })
    .withMessage("Recipients must be an array with 1-1000 phone numbers")
    .custom((recipients: string[]) => {
      return recipients.every(isValidPhoneNumber);
    })
    .withMessage("All recipients must be valid phone numbers"),

  body("message")
    .trim()
    .isLength({ min: 1, max: 1600 })
    .withMessage("Message must be 1-1600 characters")
    .customSanitizer(sanitizeHtml),

  handleValidationErrors,
];

/**
 * User registration validation rules
 */
export const validateUserRegistration = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be 2-100 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name must contain only letters and spaces")
    .customSanitizer(sanitizeHtml),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage("Email must be less than 255 characters"),

  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be 8-128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain uppercase, lowercase, number and special character"
    ),

  body("role")
    .optional()
    .isIn(["CLIENT", "ADMIN"])
    .withMessage("Role must be CLIENT or ADMIN"),

  handleValidationErrors,
];

/**
 * User login validation rules
 */
export const validateUserLogin = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  body("password").isLength({ min: 1 }).withMessage("Password is required"),

  handleValidationErrors,
];

/**
 * Sender ID validation rules
 */
export const validateSenderId = [
  body("senderId")
    .trim()
    .isLength({ min: 3, max: 11 })
    .withMessage("Sender ID must be 3-11 characters")
    .custom(isValidSenderId)
    .withMessage("Sender ID must be alphanumeric")
    .customSanitizer(sanitizeHtml),

  body("purpose")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Purpose must be less than 500 characters")
    .customSanitizer(sanitizeHtml),

  handleValidationErrors,
];

/**
 * Contact validation rules
 */
export const validateContact = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be 1-100 characters")
    .customSanitizer(sanitizeHtml),

  body("phoneNumber")
    .trim()
    .custom(isValidPhoneNumber)
    .withMessage("Invalid phone number format")
    .customSanitizer(sanitizeHtml),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  body("groupId").optional().isUUID().withMessage("Invalid group ID format"),

  handleValidationErrors,
];

/**
 * Pagination validation rules
 */
export const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage("Page must be a positive integer less than 10000")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Limit must be between 1 and 1000")
    .toInt(),

  handleValidationErrors,
];

/**
 * UUID parameter validation
 */
export const validateUuidParam = (paramName: string = "id") => [
  param(paramName).isUUID().withMessage(`Invalid ${paramName} format`),

  handleValidationErrors,
];

/**
 * File upload validation
 */
export const validateFileUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.file) {
    return next(ApiError.badRequest("No file uploaded"));
  }

  const file = req.file;
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  const maxSize = 5 * 1024 * 1024; // 5MB

  // Check file size
  if (file.size > maxSize) {
    return next(ApiError.badRequest("File size must be less than 5MB"));
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return next(
      ApiError.badRequest("Only JPEG, PNG, GIF, and WebP images are allowed")
    );
  }

  // Check file signature (magic numbers)
  const buffer = file.buffer;
  const isValidImage = checkFileSignature(buffer, file.mimetype);

  if (!isValidImage) {
    return next(ApiError.badRequest("Invalid file format or corrupted file"));
  }

  next();
};

/**
 * Check file signature to prevent MIME type spoofing
 */
function checkFileSignature(buffer: Buffer, mimeType: string): boolean {
  const signatures: { [key: string]: number[][] } = {
    "image/jpeg": [[0xff, 0xd8, 0xff]],
    "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    "image/gif": [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    ],
    "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  };

  const fileSignatures = signatures[mimeType];
  if (!fileSignatures) return false;

  return fileSignatures.some((signature) => {
    return signature.every((byte, index) => buffer[index] === byte);
  });
}
