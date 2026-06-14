import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/http";
import { AutomationService } from "../automation/automation.service";

const webhookSchema = z.object({
  phone: z.string().min(6),
  message: z.string().min(1)
});

export const whatsappController = {
  async webhook(req: Request, res: Response) {
    const data = webhookSchema.parse(req.body);
    const client = await prisma.client.findFirst({ where: { phone: data.phone } });

    if (!client) {
      throw new AppError(404, "Cliente não encontrado pelo telefone informado.");
    }

    const automation = await AutomationService.receiveMessage(client.id, data.message);
    return res.json({ received: true, client, automation });
  }
};
