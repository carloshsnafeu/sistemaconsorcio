import { Request, Response } from "express";
import { QuotaStatus } from "@prisma/client";
import { z } from "zod";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { QuotaService } from "./quota.service";

const reserveSchema = z.object({
  clientId: z.string().min(1)
});

function parseStatus(value: unknown) {
  const result = z.nativeEnum(QuotaStatus).safeParse(value);
  return result.success ? result.data : undefined;
}

export const quotaController = {
  async list(req: Request, res: Response) {
    return res.json(await QuotaService.list(req.query.groupId?.toString(), parseStatus(req.query.status)));
  },

  async reserve(req: Request, res: Response) {
    const data = reserveSchema.parse(req.body);
    const user = (req as AuthenticatedRequest).user;
    return res.json(await QuotaService.reserve(req.params.id, data.clientId, user?.id));
  },

  async activate(req: Request, res: Response) {
    const user = (req as AuthenticatedRequest).user;
    return res.json(await QuotaService.activate(req.params.id, user?.id));
  }
};
