import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Generate a JWT token for the user
 * @param userId User ID to encode in the token
 * @returns JWT token string
 */
export const generateToken = (userId: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  
  return jwt.sign(
    { id: userId },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as jwt.SignOptions
  );
};

/**
 * Hash a password
 * @param password Plain text password
 * @returns Hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare a plain text password with a hashed password
 * @param password Plain text password
 * @param hashedPassword Hashed password from database
 * @returns Boolean indicating if passwords match
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Generate a unique API key for a client
 * @returns Unique API key string
 */
export const generateApiKey = (): string => {
  return `msk_${crypto.randomBytes(16).toString('hex')}`;
};

/**
 * Validate email format
 * @param email Email to validate
 * @returns Boolean indicating if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param password Password to validate
 * @returns Boolean indicating if password meets strength requirements
 */
export const isStrongPassword = (password: string): boolean => {
  // At least 8 characters, with at least one lowercase, one uppercase, one number, and one special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Generate a secure random refresh token string
 */
export const generateRefreshToken = (): string => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Hash a refresh token for secure storage
 */
export const hashRefreshToken = async (token: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(token, salt);
};

/**
 * Verify a refresh token against its hash
 */
export const verifyRefreshToken = async (token: string, hashed: string): Promise<boolean> => {
  return bcrypt.compare(token, hashed);
};

/**
 * Get refresh token expiry date
 */
export const getRefreshTokenExpiry = (): Date => {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const now = new Date();
  // Supports 'Xd' format only for now
  const match = expiresIn.match(/^(\d+)d$/);
  if (match) {
    now.setDate(now.getDate() + parseInt(match[1], 10));
    return now;
  }
  // fallback: 7 days
  now.setDate(now.getDate() + 7);
  return now;
};
