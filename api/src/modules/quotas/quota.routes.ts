import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { quotaController } from "./quota.controller";

const router = Router();

router.get("/", asyncHandler(quotaController.list));
router.post("/:id/reserve", asyncHandler(quotaController.reserve));
router.post("/:id/activate", asyncHandler(quotaController.activate));

export default router;
