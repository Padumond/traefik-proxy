import { Router } from "express";
import { SmsPackagesController } from "../controllers/smsPackages.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Public routes (no authentication required)
router.get("/packages", SmsPackagesController.getPackages);
router.get("/packages/:packageId", SmsPackagesController.getPackageById);

// Protected routes (authentication required)
router.use(authenticate);

// User routes
router.get("/balance", SmsPackagesController.getUserBalance);
router.get("/purchases", SmsPackagesController.getPurchaseHistory);
router.post(
  "/packages/:packageId/purchase",
  SmsPackagesController.purchasePackage
);
router.post(
  "/packages/:packageId/complete",
  SmsPackagesController.completePurchase
);
router.post(
  "/custom-package/purchase",
  SmsPackagesController.purchaseCustomPackage
);
router.post("/paystack/success", SmsPackagesController.handlePaystackSuccess);
router.post(
  "/credits/purchase-with-wallet",
  SmsPackagesController.purchaseCreditsWithWallet
);

// Admin routes (for now, just authenticated users can create packages)
router.post("/packages", SmsPackagesController.createPackage);
router.put("/packages/:packageId", SmsPackagesController.updatePackage);
router.delete("/packages/:packageId", SmsPackagesController.deletePackage);

export default router;
