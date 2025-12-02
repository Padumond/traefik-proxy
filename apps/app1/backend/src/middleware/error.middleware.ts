import { Request, Response, NextFunction } from "express";

export interface ApiError extends Error {
  statusCode?: number;
  errors?: any[];
  context?: any;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const errors = err.errors || [];

  // Log error for debugging (but not in production)
  if (process.env.NODE_ENV !== "production") {
    console.error(`[ERROR] ${err.stack}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

// Custom error class for API errors
export class ApiError extends Error {
  statusCode?: number;
  errors?: any[];
  context?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    errors: any[] = [],
    context?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.context = context;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errors: any[] = []) {
    return new ApiError(message, 400, errors);
  }

  static unauthorized(message: string = "Unauthorized", errors: any[] = []) {
    return new ApiError(message, 401, errors);
  }

  static forbidden(message: string = "Forbidden", errors: any[] = []) {
    return new ApiError(message, 403, errors);
  }

  static notFound(message: string = "Resource not found", errors: any[] = []) {
    return new ApiError(message, 404, errors);
  }

  static methodNotAllowed(
    message: string = "Method not allowed",
    errors: any[] = []
  ) {
    return new ApiError(message, 405, errors);
  }

  static conflict(message: string, errors: any[] = []) {
    return new ApiError(message, 409, errors);
  }

  static validationError(
    message: string = "Validation Error",
    errors: any[] = []
  ) {
    return new ApiError(message, 422, errors);
  }

  static tooManyRequests(
    message: string = "Too many requests",
    errors: any[] = []
  ) {
    return new ApiError(message, 429, errors);
  }

  static internal(
    message: string = "Internal Server Error",
    errors: any[] = []
  ) {
    return new ApiError(message, 500, errors);
  }
}
