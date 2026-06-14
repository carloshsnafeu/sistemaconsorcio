import { Request, Response } from "express";
import { PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { PaymentService } from "./payment.service";

const paymentSchema = z.object({
  clientId: z.string().min(1),
  groupId: z.string().min(1),
  quotaId: z.string().optional(),
  amount: z.coerce.number().positive(),
  dueDate: z.coerce.date(),
  method: z.string().optional(),
  notes: z.string().optional()
});

function parseStatus(value: unknown) {
  const result = z.nativeEnum(PaymentStatus).safeParse(value);
  return result.success ? result.data : undefined;
}

export const paymentController = {
  async list(req: Request, res: Response) {
    return res.json(await PaymentService.list(parseStatus(req.query.status)));
  },

  async create(req: Request, res: Response) {
    const data = paymentSchema.parse(req.body);
    const user = (req as AuthenticatedRequest).user;
    return res.status(201).json(await PaymentService.create(data, user?.id));
  },

  async markAsPaid(req: Request, res: Response) {
    const user = (req as AuthenticatedRequest).user;
    return res.json(await PaymentService.markAsPaid(req.params.id, user?.id));
  }
};
