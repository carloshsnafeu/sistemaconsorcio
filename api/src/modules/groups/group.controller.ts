import { Request, Response } from "express";
import { GroupStatus } from "@prisma/client";
import { z } from "zod";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { GroupService } from "./group.service";

const groupSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  quotaValue: z.coerce.number().positive(),
  quotaQuantity: z.coerce.number().int().positive(),
  prizeValue: z.coerce.number().positive().optional(),
  prizeDescription: z.string().optional(),
  status: z.nativeEnum(GroupStatus).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
});

export const groupController = {
  async list(_req: Request, res: Response) {
    return res.json(await GroupService.list());
  },

  async get(req: Request, res: Response) {
    return res.json(await GroupService.get(req.params.id));
  },

  async create(req: Request, res: Response) {
    const data = groupSchema.parse(req.body);
    const user = (req as AuthenticatedRequest).user;
    return res.status(201).json(await GroupService.create(data, user?.id));
  },

  async generateQuotas(req: Request, res: Response) {
    const user = (req as AuthenticatedRequest).user;
    return res.json(await GroupService.generateQuotas(req.params.id, user?.id));
  }
};
