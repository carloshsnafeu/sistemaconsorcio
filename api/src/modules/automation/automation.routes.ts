import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { automationController } from "./automation.controller";

const router = Router();

router.get("/", asyncHandler(automationController.list));
router.post("/run-pending", asyncHandler(automationController.runPending));
router.get("/:clientId", asyncHandler(automationController.get));
router.post("/:clientId/start", asyncHandler(automationController.start));
router.post("/:clientId/receive-message", asyncHandler(automationController.receiveMessage));
router.post("/:clientId/advance", asyncHandler(automationController.advance));
router.post("/:clientId/fallback", asyncHandler(automationController.fallback));

export default router;
