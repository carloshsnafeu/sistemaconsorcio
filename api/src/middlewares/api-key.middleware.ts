import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/http";

export function apiKeyMiddleware(req: Request, _res: Response, next: NextFunction) {
  const apiKey = req.header("x-api-key");

  if (!apiKey || apiKey !== env.PUBLIC_API_KEY) {
    throw new AppError(401, "API key inválida ou ausente.");
  }

  next();
}
