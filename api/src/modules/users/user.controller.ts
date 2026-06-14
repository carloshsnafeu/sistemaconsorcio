import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { UserService } from "./user.service";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole).default(UserRole.OPERATOR),
  active: z.boolean().optional()
});

const updateUserSchema = createUserSchema.partial().extend({
  password: z.string().min(6).optional()
});

export const userController = {
  async list(_req: Request, res: Response) {
    return res.json(await UserService.list());
  },

  async get(req: Request, res: Response) {
    return res.json(await UserService.get(req.params.id));
  },

  async create(req: Request, res: Response) {
    const data = createUserSchema.parse(req.body);
    return res.status(201).json(await UserService.create(data));
  },

  async update(req: Request, res: Response) {
    const data = updateUserSchema.parse(req.body);
    return res.json(await UserService.update(req.params.id, data));
  }
};
