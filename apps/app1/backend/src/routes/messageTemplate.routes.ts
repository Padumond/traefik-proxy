import express from 'express';
import { MessageTemplateController } from '../controllers/messageTemplate.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

/**
 * @route GET /api/templates
 * @desc Get all message templates
 * @access Private
 */
router.get('/', authenticate, asyncHandler(MessageTemplateController.getAll));

/**
 * @route GET /api/templates/:id
 * @desc Get a message template by ID
 * @access Private
 */
router.get('/:id', authenticate, asyncHandler(MessageTemplateController.getById));

/**
 * @route POST /api/templates
 * @desc Create a new message template
 * @access Private
 */
router.post('/', authenticate, asyncHandler(MessageTemplateController.create));

/**
 * @route PUT /api/templates/:id
 * @desc Update a message template
 * @access Private
 */
router.put('/:id', authenticate, asyncHandler(MessageTemplateController.update));

/**
 * @route DELETE /api/templates/:id
 * @desc Delete a message template
 * @access Private
 */
router.delete('/:id', authenticate, asyncHandler(MessageTemplateController.delete));

export default router;
