import { Router } from "express";
import { apiKeyMiddleware } from "../../middlewares/api-key.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { publicController } from "./public.controller";

const router = Router();

router.use(apiKeyMiddleware);

router.get("/groups/available", asyncHandler(publicController.availableGroups));
router.get("/groups/:id/quotas/available", asyncHandler(publicController.availableQuotas));
router.get("/clients/by-phone/:phone/status", asyncHandler(publicController.clientStatusByPhone));
router.post("/clients/from-kommo", asyncHandler(publicController.createOrUpdateClientFromKommo));
router.post("/quotas/reserve", asyncHandler(publicController.reserveQuota));
router.post("/payments/create-link", asyncHandler(publicController.createPaymentLink));
router.post("/kommo/action", asyncHandler(publicController.kommoAction));

export default router;
