import { Request, Response } from "express";
import { z } from "zod";
import { AutomationService } from "./automation.service";

const messageSchema = z.object({
  message: z.string().min(1)
});

export const automationController = {
  async list(_req: Request, res: Response) {
    return res.json(await AutomationService.list());
  },

  async get(req: Request, res: Response) {
    return res.json(await AutomationService.get(req.params.clientId));
  },

  async start(req: Request, res: Response) {
    return res.json(await AutomationService.start(req.params.clientId));
  },

  async receiveMessage(req: Request, res: Response) {
    const data = messageSchema.parse(req.body);
    return res.json(await AutomationService.receiveMessage(req.params.clientId, data.message));
  },

  async advance(req: Request, res: Response) {
    return res.json(await AutomationService.advance(req.params.clientId));
  },

  async fallback(req: Request, res: Response) {
    return res.json(await AutomationService.fallback(req.params.clientId));
  },

  async runPending(_req: Request, res: Response) {
    return res.json(await AutomationService.runPending());
  }
};
