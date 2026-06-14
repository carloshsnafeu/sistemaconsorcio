import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireRole } from "../../middlewares/role.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { userController } from "./user.controller";

const router = Router();

router.get("/", requireRole(UserRole.ADMIN), asyncHandler(userController.list));
router.post("/", requireRole(UserRole.ADMIN), asyncHandler(userController.create));
router.get("/:id", requireRole(UserRole.ADMIN), asyncHandler(userController.get));
router.patch("/:id", requireRole(UserRole.ADMIN), asyncHandler(userController.update));

export default router;
