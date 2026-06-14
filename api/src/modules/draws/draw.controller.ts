import { Request, Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { DrawService } from "./draw.service";

const drawSchema = z.object({
  groupId: z.string().min(1),
  title: z.string().min(2),
  drawDate: z.coerce.date(),
  notes: z.string().optional()
});

const resultSchema = z.object({
  drawnNumber: z.coerce.number().int().positive()
});

export const drawController = {
  async list(_req: Request, res: Response) {
    return res.json(await DrawService.list());
  },

  async get(req: Request, res: Response) {
    return res.json(await DrawService.get(req.params.id));
  },

  async create(req: Request, res: Response) {
    const data = drawSchema.parse(req.body);
    const user = (req as AuthenticatedRequest).user;
    return res.status(201).json(await DrawService.create({ ...data, createdById: user?.id }));
  },

  async registerResult(req: Request, res: Response) {
    const data = resultSchema.parse(req.body);
    const user = (req as AuthenticatedRequest).user;
    return res.json(await DrawService.registerResult(req.params.id, data.drawnNumber, user?.id));
  }
};
