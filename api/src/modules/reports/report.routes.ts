import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { reportController } from "./report.controller";

const router = Router();

router.get("/dashboard", asyncHandler(reportController.dashboard));
router.get("/clients", asyncHandler(reportController.clients));
router.get("/quotas/:groupId", asyncHandler(reportController.quotas));
router.get("/financial", asyncHandler(reportController.financial));
router.get("/draw-eligible/:groupId", asyncHandler(reportController.drawEligible));
router.get("/winners", asyncHandler(reportController.winners));
router.get("/funnel", asyncHandler(reportController.funnel));
router.get("/fallbacks", asyncHandler(reportController.fallbacks));
router.get("/human-queue", asyncHandler(reportController.humanQueue));
router.get("/audit", asyncHandler(reportController.audit));

export default router;
