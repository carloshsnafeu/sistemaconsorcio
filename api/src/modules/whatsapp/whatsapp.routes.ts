import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { whatsappController } from "./whatsapp.controller";

const router = Router();

router.post("/webhook", asyncHandler(whatsappController.webhook));

export default router;
