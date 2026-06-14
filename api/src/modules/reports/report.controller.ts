import { Request, Response } from "express";
import { ReportService } from "./report.service";

export const reportController = {
  async dashboard(_req: Request, res: Response) {
    return res.json(await ReportService.dashboard());
  },

  async clients(_req: Request, res: Response) {
    return res.json(await ReportService.clients());
  },

  async quotas(req: Request, res: Response) {
    return res.json(await ReportService.quotas(req.params.groupId));
  },

  async financial(_req: Request, res: Response) {
    return res.json(await ReportService.financial());
  },

  async drawEligible(req: Request, res: Response) {
    return res.json(await ReportService.drawEligible(req.params.groupId));
  },

  async winners(_req: Request, res: Response) {
    return res.json(await ReportService.winners());
  },

  async funnel(_req: Request, res: Response) {
    return res.json(await ReportService.funnel());
  },

  async fallbacks(_req: Request, res: Response) {
    return res.json(await ReportService.fallbacks());
  },

  async humanQueue(_req: Request, res: Response) {
    return res.json(await ReportService.humanQueue());
  },

  async audit(_req: Request, res: Response) {
    return res.json(await ReportService.audit());
  }
};
