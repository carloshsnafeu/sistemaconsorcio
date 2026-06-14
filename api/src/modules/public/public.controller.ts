import { Request, Response } from "express";
import { z } from "zod";
import { PublicService } from "./public.service";

const clientFromKommoSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  cpf: z.string().optional(),
  origin: z.string().optional(),
  kommoContactId: z.string().optional(),
  kommoLeadId: z.string().optional()
});

const reserveQuotaSchema = z.object({
  phone: z.string().min(6),
  groupId: z.string().min(1),
  quotaNumber: z.coerce.number().int().positive(),
  kommoLeadId: z.string().optional(),
  kommoContactId: z.string().optional()
});

const paymentLinkSchema = z.object({
  phone: z.string().min(6),
  quotaId: z.string().min(1),
  groupId: z.string().min(1)
});

const kommoActionSchema = z.object({
  action: z.string().min(1),
  phone: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  kommo: z
    .object({
      leadId: z.string().optional(),
      contactId: z.string().optional()
    })
    .optional()
});

export const publicController = {
  async availableGroups(_req: Request, res: Response) {
    return res.json(await PublicService.availableGroups());
  },

  async availableQuotas(req: Request, res: Response) {
    return res.json(await PublicService.availableQuotas(req.params.id));
  },

  async clientStatusByPhone(req: Request, res: Response) {
    return res.json(await PublicService.clientStatusByPhone(req.params.phone));
  },

  async createOrUpdateClientFromKommo(req: Request, res: Response) {
    const data = clientFromKommoSchema.parse(req.body);
    return res.status(201).json(await PublicService.createOrUpdateClientFromKommo(data));
  },

  async reserveQuota(req: Request, res: Response) {
    const data = reserveQuotaSchema.parse(req.body);
    return res.json(await PublicService.reserveQuota(data));
  },

  async createPaymentLink(req: Request, res: Response) {
    const data = paymentLinkSchema.parse(req.body);
    return res.json(await PublicService.createPaymentLink(data));
  },

  async kommoAction(req: Request, res: Response) {
    const data = kommoActionSchema.parse(req.body);
    return res.json(await PublicService.handleKommoAction(data));
  }
};
