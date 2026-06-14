import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { groupController } from "./group.controller";

const router = Router();

router.get("/", asyncHandler(groupController.list));
router.post("/", asyncHandler(groupController.create));
router.get("/:id", asyncHandler(groupController.get));
router.post("/:id/generate-quotas", asyncHandler(groupController.generateQuotas));

export default router;
