import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuditService } from "./audit.service";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    return res.json(await AuditService.list());
  })
);

export default router;
