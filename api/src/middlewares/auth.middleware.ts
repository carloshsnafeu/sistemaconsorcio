import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { AppError } from "../utils/http";
import { verifyToken } from "../utils/jwt";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function authMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "Token de autenticação não informado.");
  }

  const token = header.replace("Bearer ", "").trim();
  req.user = verifyToken(token);
  next();
}
