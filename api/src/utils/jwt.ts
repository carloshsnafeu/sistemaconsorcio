import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { env } from "../config/env";

export interface JwtUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export function signToken(user: JwtUser) {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as JwtUser;
}
