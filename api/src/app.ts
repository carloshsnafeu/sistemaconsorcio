import cors from "cors";
import express from "express";
import { authMiddleware } from "./middlewares/auth.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import auditRoutes from "./modules/audit/audit.routes";
import automationRoutes from "./modules/automation/automation.routes";
import clientRoutes from "./modules/clients/client.routes";
import drawRoutes from "./modules/draws/draw.routes";
import groupRoutes from "./modules/groups/group.routes";
import kommoRoutes from "./modules/kommo/kommo.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import publicRoutes from "./modules/public/public.routes";
import quotaRoutes from "./modules/quotas/quota.routes";
import reportRoutes from "./modules/reports/report.routes";
import userRoutes from "./modules/users/user.routes";
import whatsappRoutes from "./modules/whatsapp/whatsapp.routes";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, name: "Sorteou Ganhou Admin API" }));

app.use("/api/auth", authRoutes);
app.use("/api/kommo", kommoRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/public", publicRoutes);

app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/clients", authMiddleware, clientRoutes);
app.use("/api/groups", authMiddleware, groupRoutes);
app.use("/api/quotas", authMiddleware, quotaRoutes);
app.use("/api/payments", authMiddleware, paymentRoutes);
app.use("/api/draws", authMiddleware, drawRoutes);
app.use("/api/reports", authMiddleware, reportRoutes);
app.use("/api/automation", authMiddleware, automationRoutes);
app.use("/api/audit", authMiddleware, auditRoutes);

app.use(errorMiddleware);
