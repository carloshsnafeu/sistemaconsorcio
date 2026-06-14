import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { drawController } from "./draw.controller";

const router = Router();

router.get("/", asyncHandler(drawController.list));
router.post("/", asyncHandler(drawController.create));
router.get("/:id", asyncHandler(drawController.get));
router.post("/:id/register-result", asyncHandler(drawController.registerResult));

export default router;
