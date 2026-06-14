import { ClientStatus, PaymentStatus, QuotaStatus } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/http";
import { AuditService } from "../audit/audit.service";
import { KommoService } from "../kommo/kommo.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";

export interface PaymentInput {
  clientId: string;
  groupId: string;
  quotaId?: string;
  amount: number;
  dueDate: Date;
  method?: string;
  notes?: string;
}

export class PaymentService {
  static async list(status?: PaymentStatus) {
    return prisma.payment.findMany({
      where: status ? { status } : undefined,
      include: { client: true, group: true, quota: true },
      orderBy: { createdAt: "desc" }
    });
  }

  static async create(data: PaymentInput, userId?: string) {
    const payment = await prisma.payment.create({
      data: {
        clientId: data.clientId,
        groupId: data.groupId,
        quotaId: data.quotaId,
        amount: data.amount,
        dueDate: data.dueDate,
        method: data.method ?? "MOCK",
        notes: data.notes,
        paymentLink: `https://pagamento.mock/sorteou-ganhou/manual-${Date.now()}`,
        externalPaymentId: `mock_manual_${Date.now()}`
      },
      include: { client: true, group: true, quota: true }
    });

    await AuditService.log({
      userId,
      entity: "Payment",
      entityId: payment.id,
      action: "CREATE",
      description: "Pagamento manual criado.",
      payload: { amount: payment.amount.toString() }
    });

    return payment;
  }

  static async markAsPaid(paymentId: string, userId?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { client: true, group: true, quota: true }
    });

    if (!payment) {
      throw new AppError(404, "Pagamento não encontrado.");
    }

    if (payment.status === PaymentStatus.PAID) {
      return payment;
    }

    const paidAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.PAID, paidAt }
      });

      if (payment.quotaId) {
        await tx.quota.update({
          where: { id: payment.quotaId },
          data: { status: QuotaStatus.ACTIVE, activatedAt: paidAt }
        });
      }

      await tx.client.update({
        where: { id: payment.clientId },
        data: { status: ClientStatus.PARTICIPANT }
      });

      await tx.automation.updateMany({
        where: { clientId: payment.clientId },
        data: {
          currentStep: ClientStatus.PARTICIPANT,
          status: ClientStatus.PARTICIPANT,
          finished: true
        }
      });
    });

    await AuditService.log({
      userId,
      entity: "Payment",
      entityId: paymentId,
      action: "MARK_AS_PAID",
      description: `Pagamento de ${payment.amount.toString()} confirmado.`
    });

    await WhatsAppService.sendMessage(
      payment.clientId,
      `Pagamento confirmado. Sua participação no ${payment.group.name} está ativa.`
    );
    await KommoService.addLeadNote(payment.clientId, `Pagamento confirmado no grupo ${payment.group.name}.`);

    return prisma.payment.findUnique({
      where: { id: paymentId },
      include: { client: true, group: true, quota: true }
    });
  }
}
