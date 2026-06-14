import { NextFunction, Response } from "express";
import { UserRole } from "@prisma/client";
import { AuthenticatedRequest } from "./auth.middleware";
import { AppError } from "../utils/http";

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, "Usuário sem permissão para esta ação.");
    }

    next();
  };
}
