import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async route handlers to properly handle promises and forward errors to Express error middleware
 * This solves the TypeScript error where async handlers return Promise<Response> instead of void
 * 
 * @param fn The async route handler function
 * @returns A function compatible with Express route handler signature
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
