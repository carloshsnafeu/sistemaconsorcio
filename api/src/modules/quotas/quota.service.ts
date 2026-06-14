import { ClientStatus, PaymentStatus, QuotaStatus } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/http";
import { AuditService } from "../audit/audit.service";
import { KommoService } from "../kommo/kommo.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";

export class QuotaService {
  static async list(groupId?: string, status?: QuotaStatus) {
    return prisma.quota.findMany({
      where: {
        groupId,
        status
      },
      include: { group: true, client: true, payments: true },
      orderBy: [{ groupId: "asc" }, { number: "asc" }]
    });
  }

  static async reserve(quotaId: string, clientId: string, userId?: string) {
    const quota = await prisma.quota.findUnique({
      where: { id: quotaId },
      include: { group: true }
    });

    if (!quota) {
      throw new AppError(404, "Cota não encontrada.");
    }

    if (quota.status !== QuotaStatus.AVAILABLE) {
      throw new AppError(409, "Cota não está disponível para reserva.");
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (!client) {
      throw new AppError(404, "Cliente não encontrado.");
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 2);
    const paymentLink = `https://pagamento.mock/sorteou-ganhou/${quota.id}`;

    const result = await prisma.$transaction(async (tx) => {
      const updatedQuota = await tx.quota.update({
        where: { id: quotaId },
        data: {
          clientId,
          status: QuotaStatus.RESERVED,
          reservedAt: new Date()
        },
        include: { group: true, client: true }
      });

      await tx.client.update({
        where: { id: clientId },
        data: { status: ClientStatus.QUOTA_RESERVED }
      });

      const payment = await tx.payment.create({
        data: {
          clientId,
          groupId: quota.groupId,
          quotaId,
          amount: quota.group.quotaValue,
          dueDate,
          status: PaymentStatus.PENDING,
          method: "MOCK",
          paymentLink,
          externalPaymentId: `mock_payment_${quota.id}`
        }
      });

      await tx.automation.updateMany({
        where: { clientId },
        data: { currentStep: ClientStatus.QUOTA_RESERVED, status: ClientStatus.QUOTA_RESERVED }
      });

      return { quota: updatedQuota, payment };
    });

    await AuditService.log({
      userId,
      entity: "Quota",
      entityId: quotaId,
      action: "RESERVE",
      description: `Cota ${quota.number} reservada para ${client.name}.`,
      payload: { clientId, paymentId: result.payment.id, paymentLink }
    });

    await WhatsAppService.sendMessage(
      clientId,
      `Sua cota ${quota.number} do ${quota.group.name} foi reservada. Link de pagamento mock: ${paymentLink}`
    );
    await KommoService.addLeadNote(clientId, `Cota ${quota.number} reservada no grupo ${quota.group.name}.`);

    return result;
  }

  static async activate(quotaId: string, userId?: string) {
    const quota = await prisma.quota.findUnique({
      where: { id: quotaId },
      include: { client: true, group: true }
    });

    if (!quota || !quota.clientId) {
      throw new AppError(404, "Cota reservada não encontrada.");
    }

    const paidPayment = await prisma.payment.findFirst({
      where: { quotaId, status: PaymentStatus.PAID }
    });

    if (!paidPayment) {
      throw new AppError(409, "A cota só pode ser ativada após pagamento PAID.");
    }

    const updatedQuota = await prisma.quota.update({
      where: { id: quotaId },
      data: { status: QuotaStatus.ACTIVE, activatedAt: new Date() },
      include: { client: true, group: true }
    });

    await prisma.client.update({
      where: { id: quota.clientId },
      data: { status: ClientStatus.PARTICIPANT }
    });

    await AuditService.log({
      userId,
      entity: "Quota",
      entityId: quotaId,
      action: "ACTIVATE",
      description: `Cota ${quota.number} ativada.`
    });

    return updatedQuota;
  }
}
