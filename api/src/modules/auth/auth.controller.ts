import { Request, Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { AuthService } from "./auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authController = {
  async login(req: Request, res: Response) {
    const data = loginSchema.parse(req.body);
    const result = await AuthService.login(data.email, data.password);
    return res.json(result);
  },

  async me(req: Request, res: Response) {
    const user = (req as AuthenticatedRequest).user;
    const result = await AuthService.me(user!.id);
    return res.json(result);
  }
};
