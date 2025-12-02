import { Request, Response, NextFunction } from "express";
const expressValidator = require("express-validator");
const { validationResult } = expressValidator;
import { ApiError } from "./error.middleware";

/**
 * Middleware to handle validation errors from express-validator
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    throw ApiError.badRequest(`Validation failed: ${errorMessages.join(", ")}`);
  }

  next();
};

/**
 * Generic validation middleware factory
 */
export const validate = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const errorMessages = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errorMessages,
    });
  };
};
