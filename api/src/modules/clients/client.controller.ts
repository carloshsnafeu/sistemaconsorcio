import { Request, Response } from "express";
import { ClientStatus } from "@prisma/client";
import { z } from "zod";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { ClientService } from "./client.service";

const clientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().optional(),
  cpf: z.string().optional(),
  origin: z.string().optional(),
  notes: z.string().optional()
});

const updateClientSchema = clientSchema.partial().extend({
  status: z.nativeEnum(ClientStatus).optional()
});

function parseStatus(value: unknown) {
  const result = z.nativeEnum(ClientStatus).safeParse(value);
  return result.success ? result.data : undefined;
}

export const clientController = {
  async list(req: Request, res: Response) {
    return res.json(await ClientService.list(parseStatus(req.query.status)));
  },

  async get(req: Request, res: Response) {
    return res.json(await ClientService.get(req.params.id));
  },

  async create(req: Request, res: Response) {
    const data = clientSchema.parse(req.body);
    const user = (req as AuthenticatedRequest).user;
    return res.status(201).json(await ClientService.create(data, user?.id));
  },

  async fromLanding(req: Request, res: Response) {
    const data = clientSchema.parse(req.body);
    return res.status(201).json(await ClientService.fromLanding(data));
  },

  async update(req: Request, res: Response) {
    const data = updateClientSchema.parse(req.body);
    return res.json(await ClientService.update(req.params.id, data));
  }
};
