import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { kommoController } from "./kommo.controller";

const router = Router();

router.post("/webhook", asyncHandler(kommoController.webhook));

export default router;
