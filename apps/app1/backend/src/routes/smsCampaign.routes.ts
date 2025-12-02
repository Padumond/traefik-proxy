import express from "express";
import { SmsCampaignController } from "../controllers/smsCampaign.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

/**
 * @route POST /api/campaigns
 * @desc Create a new SMS campaign
 * @access Private
 */
router.post("/", authenticate, SmsCampaignController.createCampaign);

/**
 * @route GET /api/campaigns
 * @desc Get user's SMS campaigns
 * @access Private
 */
router.get("/", authenticate, SmsCampaignController.getUserCampaigns);

/**
 * @route GET /api/campaigns/:id
 * @desc Get campaign details
 * @access Private
 */
router.get("/:id", authenticate, SmsCampaignController.getCampaignById);

/**
 * @route PUT /api/campaigns/:id/cancel
 * @desc Cancel scheduled campaign
 * @access Private
 */
router.put("/:id/cancel", authenticate, SmsCampaignController.cancelCampaign);

/**
 * @route GET /api/campaigns/:id/messages
 * @desc Get campaign messages
 * @access Private
 */
router.get("/:id/messages", authenticate, SmsCampaignController.getCampaignMessages);

/**
 * @route GET /api/campaigns/:id/analytics
 * @desc Get campaign analytics
 * @access Private
 */
router.get("/:id/analytics", authenticate, SmsCampaignController.getCampaignAnalytics);

export default router;
