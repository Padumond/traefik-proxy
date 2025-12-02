import express from 'express';
import { ClientApiController } from '../controllers/clientApi.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * @route POST /api/client-api
 * @desc Create a new client API route
 * @access Private
 */
router.post('/', authenticate, ClientApiController.createClientApi);

/**
 * @route GET /api/client-api
 * @desc Get all client API routes for a user
 * @access Private
 */
router.get('/', authenticate, ClientApiController.getClientApis);

/**
 * @route PUT /api/client-api/:id
 * @desc Update client API route
 * @access Private
 */
router.put('/:id', authenticate, ClientApiController.updateClientApi);

/**
 * @route DELETE /api/client-api/:id
 * @desc Delete client API route
 * @access Private
 */
router.delete('/:id', authenticate, ClientApiController.deleteClientApi);

export default router;
