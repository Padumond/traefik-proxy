import express from 'express';
import { ContactGroupController } from '../controllers/contactGroup.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

/**
 * @route GET /api/contacts/groups
 * @desc Get all contact groups
 * @access Private
 */
router.get('/', authenticate, asyncHandler(ContactGroupController.getAll));

/**
 * @route GET /api/contacts/groups/:id
 * @desc Get a contact group by ID
 * @access Private
 */
router.get('/:id', authenticate, asyncHandler(ContactGroupController.getById));

/**
 * @route POST /api/contacts/groups
 * @desc Create a new contact group
 * @access Private
 */
router.post('/', authenticate, asyncHandler(ContactGroupController.create));

/**
 * @route PUT /api/contacts/groups/:id
 * @desc Update a contact group
 * @access Private
 */
router.put('/:id', authenticate, asyncHandler(ContactGroupController.update));

/**
 * @route DELETE /api/contacts/groups/:id
 * @desc Delete a contact group
 * @access Private
 */
router.delete('/:id', authenticate, asyncHandler(ContactGroupController.delete));

/**
 * @route POST /api/contacts/groups/:id/contacts
 * @desc Add contacts to a group
 * @access Private
 */
router.post('/:id/contacts', authenticate, asyncHandler(ContactGroupController.addContacts));

/**
 * @route DELETE /api/contacts/groups/:id/contacts
 * @desc Remove contacts from a group
 * @access Private
 */
router.delete('/:id/contacts', authenticate, asyncHandler(ContactGroupController.removeContacts));

export default router;
