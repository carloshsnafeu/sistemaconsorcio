import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { paymentController } from "./payment.controller";

const router = Router();

router.get("/", asyncHandler(paymentController.list));
router.post("/", asyncHandler(paymentController.create));
router.post("/:id/mark-as-paid", asyncHandler(paymentController.markAsPaid));

export default router;
