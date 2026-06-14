import { Request, Response } from "express";
import { KommoService } from "./kommo.service";

export const kommoController = {
  async webhook(req: Request, res: Response) {
    const event = await KommoService.saveWebhook(req.body);
    return res.status(201).json({ received: true, event });
  }
};
