import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { clientController } from "./client.controller";

const router = Router();

router.get("/", asyncHandler(clientController.list));
router.post("/", asyncHandler(clientController.create));
router.post("/from-landing", asyncHandler(clientController.fromLanding));
router.get("/:id", asyncHandler(clientController.get));
router.patch("/:id", asyncHandler(clientController.update));

export default router;
