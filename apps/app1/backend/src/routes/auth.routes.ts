import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', AuthController.register);

/**
 * @route POST /api/auth/login
 * @desc Login a user
 * @access Public
 */
router.post('/login', AuthController.login);

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
router.get('/me', authenticate, AuthController.getCurrentUser);

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', authenticate, AuthController.updateProfile);

/**
 * @route POST /api/auth/regenerate-api-key
 * @desc Regenerate API key
 * @access Private
 */
router.post('/regenerate-api-key', authenticate, AuthController.regenerateApiKey);

export default router;
