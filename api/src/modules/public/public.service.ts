import {
  ClientStatus,
  GroupStatus,
  MessageChannel,
  MessageDirection,
  PaymentStatus,
  Prisma,
  QuotaStatus
} from "@prisma/client";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/http";
import { AuditService } from "../audit/audit.service";
import { KommoService } from "../kommo/kommo.service";

export interface PublicClientInput {
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  origin?: string;
  kommoContactId?: string;
  kommoLeadId?: string;
}

export interface PublicReserveInput {
  phone: string;
  groupId: string;
  quotaNumber: number;
  kommoLeadId?: string;
  kommoContactId?: string;
}

export interface PublicPaymentLinkInput {
  phone: string;
  quotaId: string;
  groupId: string;
}

export interface PublicKommoActionInput {
  action: string;
  phone?: string;
  payload?: Record<string, unknown>;
  kommo?: {
    leadId?: string;
    contactId?: string;
  };
}

const clientPublicInclude = {
  quotas: { include: { group: true }, orderBy: { createdAt: "desc" as const } },
  payments: { include: { group: true, quota: true }, orderBy: { createdAt: "desc" as const } },
  automation: true
};

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function money(value: Prisma.Decimal | number | string | null | undefined) {
  return Number(value ?? 0);
}

function paymentLinkFor(quotaId: string) {
  return `https://pagamento.mock/sorteou-ganhou/${quotaId}`;
}

function dueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  return date;
}

function toJson(payload: unknown) {
  return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
}

async function findClientByPhone(phone: string) {
  const normalizedPhone = normalizePhone(phone);

  const exact = await prisma.client.findFirst({
    where: { phone: normalizedPhone },
    include: clientPublicInclude
  });

  if (exact) {
    return exact;
  }

  const candidates = await prisma.client.findMany({
    select: { id: true, phone: true }
  });

  const match = candidates.find((client) => normalizePhone(client.phone) === normalizedPhone);

  if (!match) {
    return null;
  }

  return prisma.client.findUnique({
    where: { id: match.id },
    include: clientPublicInclude
  });
}

async function ensureAutomation(clientId: string, status: ClientStatus) {
  return prisma.automation.upsert({
    where: { clientId },
    update: {
      currentStep: status,
      status
    },
    create: {
      clientId,
      currentStep: status,
      status
    }
  });
}

export class PublicService {
  static normalizePhone(phone: string) {
    return normalizePhone(phone);
  }

  static async availableGroups() {
    const groups = await prisma.group.findMany({
      where: { status: { in: [GroupStatus.OPEN, GroupStatus.IN_PROGRESS] } },
      orderBy: { createdAt: "desc" }
    });

    const result = await Promise.all(
      groups.map(async (group) => {
        const counts = await prisma.quota.groupBy({
          by: ["status"],
          where: { groupId: group.id },
          _count: { _all: true }
        });

        const countByStatus = Object.fromEntries(counts.map((item) => [item.status, item._count._all]));

        return {
          id: group.id,
          name: group.name,
          quotaValue: money(group.quotaValue),
          quotaQuantity: group.quotaQuantity,
          prizeDescription: group.prizeDescription,
          availableQuotas: countByStatus[QuotaStatus.AVAILABLE] ?? 0,
          activeQuotas: countByStatus[QuotaStatus.ACTIVE] ?? 0,
          reservedQuotas:
            (countByStatus[QuotaStatus.RESERVED] ?? 0) + (countByStatus[QuotaStatus.WAITING_PAYMENT] ?? 0)
        };
      })
    );

    return { groups: result };
  }

  static async availableQuotas(groupId: string) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });

    if (!group) {
      throw new AppError(404, "Grupo não encontrado.");
    }

    const availableQuotas = await prisma.quota.findMany({
      where: { groupId, status: QuotaStatus.AVAILABLE },
      select: { id: true, number: true },
      orderBy: { number: "asc" }
    });

    return { groupId, availableQuotas };
  }

  static async clientStatusByPhone(phone: string) {
    const client = await findClientByPhone(phone);

    if (!client) {
      return { exists: false };
    }

    return {
      exists: true,
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        cpf: client.cpf,
        status: client.status,
        quotas: client.quotas,
        payments: client.payments
      }
    };
  }

  static async createOrUpdateClientFromKommo(data: PublicClientInput) {
    const phone = normalizePhone(data.phone);
    const existing = await findClientByPhone(phone);

    const client = existing
      ? await prisma.client.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            phone,
            email: data.email,
            cpf: data.cpf,
            origin: data.origin ?? existing.origin ?? "KOMMO",
            kommoContactId: data.kommoContactId,
            kommoLeadId: data.kommoLeadId
          }
        })
      : await prisma.client.create({
          data: {
            name: data.name,
            phone,
            email: data.email,
            cpf: data.cpf,
            origin: data.origin ?? "KOMMO",
            status: ClientStatus.NEW_LEAD,
            kommoContactId: data.kommoContactId,
            kommoLeadId: data.kommoLeadId
          }
        });

    await ensureAutomation(client.id, client.status);

    await AuditService.log({
      entity: "Client",
      entityId: client.id,
      action: existing ? "KOMMO_CLIENT_UPDATED" : "KOMMO_CLIENT_CREATED",
      description: existing ? "Cliente atualizado pela Kommo." : "Cliente criado pela Kommo.",
      payload: toJson({
        phone,
        kommoContactId: data.kommoContactId,
        kommoLeadId: data.kommoLeadId
      })
    });

    const syncedContact = await KommoService.createOrUpdateContact(client.id, {
      name: data.name,
      phone,
      email: data.email,
      contactId: data.kommoContactId,
      leadId: data.kommoLeadId
    });

    if (data.kommoLeadId) {
      await KommoService.createLead(syncedContact, {
        contactId: data.kommoContactId,
        leadId: data.kommoLeadId
      });
    }

    return prisma.client.findUnique({
      where: { id: client.id },
      include: clientPublicInclude
    });
  }

  static async reserveQuota(data: PublicReserveInput) {
    const phone = normalizePhone(data.phone);
    const client = await findClientByPhone(phone);

    if (!client) {
      throw new AppError(404, "Cliente não encontrado. Cadastre o cliente antes de reservar a cota.");
    }

    if (data.kommoContactId || data.kommoLeadId) {
      await prisma.client.update({
        where: { id: client.id },
        data: {
          kommoContactId: data.kommoContactId ?? client.kommoContactId,
          kommoLeadId: data.kommoLeadId ?? client.kommoLeadId
        }
      });
    }

    const quota = await prisma.quota.findUnique({
      where: { groupId_number: { groupId: data.groupId, number: data.quotaNumber } },
      include: { group: true }
    });

    if (!quota) {
      throw new AppError(404, "Cota não encontrada para este grupo.");
    }

    if (quota.status !== QuotaStatus.AVAILABLE) {
      return {
        success: false,
        reason: "QUOTA_NOT_AVAILABLE",
        message: "Essa cota não está mais disponível. Escolha outro número."
      };
    }

    const link = paymentLinkFor(quota.id);
    const message = `Cota ${quota.number} reservada com sucesso. Para confirmar sua participação, finalize o pagamento.`;

    const result = await prisma.$transaction(async (tx) => {
      const reservedQuota = await tx.quota.update({
        where: { id: quota.id },
        data: {
          clientId: client.id,
          status: QuotaStatus.WAITING_PAYMENT,
          reservedAt: new Date()
        },
        include: { group: true, client: true }
      });

      const updatedClient = await tx.client.update({
        where: { id: client.id },
        data: { status: ClientStatus.PAYMENT_LINK_SENT },
        include: clientPublicInclude
      });

      const payment = await tx.payment.create({
        data: {
          clientId: client.id,
          groupId: quota.groupId,
          quotaId: quota.id,
          amount: quota.group.quotaValue,
          dueDate: dueDate(),
          status: PaymentStatus.PENDING,
          method: "MOCK",
          paymentLink: link,
          externalPaymentId: `mock_kommo_${quota.id}`
        }
      });

      await tx.automation.upsert({
        where: { clientId: client.id },
        update: {
          currentStep: ClientStatus.PAYMENT_LINK_SENT,
          status: ClientStatus.PAYMENT_LINK_SENT
        },
        create: {
          clientId: client.id,
          currentStep: ClientStatus.PAYMENT_LINK_SENT,
          status: ClientStatus.PAYMENT_LINK_SENT
        }
      });

      await tx.conversationMessage.create({
        data: {
          clientId: client.id,
          direction: MessageDirection.OUTBOUND,
          channel: MessageChannel.SYSTEM,
          message,
          payload: toJson({ quotaId: quota.id, paymentLink: link })
        }
      });

      return { client: updatedClient, quota: reservedQuota, payment };
    });

    await AuditService.log({
      entity: "Quota",
      entityId: quota.id,
      action: "KOMMO_RESERVE_QUOTA",
      description: `Cota ${quota.number} reservada pela Kommo.`,
      payload: toJson({
        clientId: client.id,
        groupId: data.groupId,
        quotaNumber: data.quotaNumber,
        paymentId: result.payment.id,
        paymentLink: link
      })
    });

    await KommoService.addLeadNote(
      client.id,
      `Cota ${quota.number} reservada no ${quota.group.name}. Link de pagamento: ${link}`
    );

    return {
      success: true,
      message,
      client: result.client,
      quota: {
        id: result.quota.id,
        number: result.quota.number,
        status: result.quota.status
      },
      payment: {
        id: result.payment.id,
        amount: money(result.payment.amount),
        status: result.payment.status,
        paymentLink: result.payment.paymentLink
      }
    };
  }

  static async createPaymentLink(data: PublicPaymentLinkInput) {
    const client = await findClientByPhone(data.phone);

    if (!client) {
      throw new AppError(404, "Cliente não encontrado. Cadastre o cliente antes de gerar pagamento.");
    }

    const quota = await prisma.quota.findUnique({
      where: { id: data.quotaId },
      include: { group: true }
    });

    if (!quota || quota.groupId !== data.groupId) {
      throw new AppError(404, "Cota não encontrada para o grupo informado.");
    }

    if (quota.clientId && quota.clientId !== client.id) {
      throw new AppError(409, "Essa cota está vinculada a outro cliente.");
    }

    const link = paymentLinkFor(quota.id);

    const payment = await prisma.$transaction(async (tx) => {
      if (!quota.clientId) {
        await tx.quota.update({
          where: { id: quota.id },
          data: {
            clientId: client.id,
            status: QuotaStatus.WAITING_PAYMENT,
            reservedAt: new Date()
          }
        });
      } else if (quota.status === QuotaStatus.RESERVED || quota.status === QuotaStatus.AVAILABLE) {
        await tx.quota.update({
          where: { id: quota.id },
          data: { status: QuotaStatus.WAITING_PAYMENT }
        });
      }

      await tx.client.update({
        where: { id: client.id },
        data: { status: ClientStatus.PAYMENT_LINK_SENT }
      });

      await tx.automation.upsert({
        where: { clientId: client.id },
        update: {
          currentStep: ClientStatus.PAYMENT_LINK_SENT,
          status: ClientStatus.PAYMENT_LINK_SENT
        },
        create: {
          clientId: client.id,
          currentStep: ClientStatus.PAYMENT_LINK_SENT,
          status: ClientStatus.PAYMENT_LINK_SENT
        }
      });

      const existingPayment = await tx.payment.findFirst({
        where: {
          clientId: client.id,
          quotaId: quota.id,
          status: PaymentStatus.PENDING
        }
      });

      if (existingPayment) {
        return existingPayment.paymentLink
          ? existingPayment
          : tx.payment.update({
              where: { id: existingPayment.id },
              data: { paymentLink: link, externalPaymentId: existingPayment.externalPaymentId ?? `mock_kommo_${quota.id}` }
            });
      }

      return tx.payment.create({
        data: {
          clientId: client.id,
          groupId: quota.groupId,
          quotaId: quota.id,
          amount: quota.group.quotaValue,
          dueDate: dueDate(),
          status: PaymentStatus.PENDING,
          method: "MOCK",
          paymentLink: link,
          externalPaymentId: `mock_kommo_${quota.id}`
        }
      });
    });

    await AuditService.log({
      entity: "Payment",
      entityId: payment.id,
      action: "KOMMO_PAYMENT_LINK_CREATED",
      description: "Link de pagamento criado ou reutilizado pela Kommo.",
      payload: toJson({ clientId: client.id, quotaId: quota.id, paymentLink: payment.paymentLink })
    });

    await KommoService.addLeadNote(client.id, `Link de pagamento enviado: ${payment.paymentLink}`);

    return {
      success: true,
      message: "Link de pagamento gerado com sucesso.",
      payment: {
        id: payment.id,
        amount: money(payment.amount),
        status: payment.status,
        paymentLink: payment.paymentLink
      }
    };
  }

  static async requestHuman(phone: string, reason = "Solicitação do AI Agent/Salesbot.") {
    const client = await findClientByPhone(phone);

    if (!client) {
      throw new AppError(404, "Cliente não encontrado.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: client.id },
        data: { status: ClientStatus.NEEDS_HUMAN }
      });

      await tx.automation.upsert({
        where: { clientId: client.id },
        update: {
          currentStep: ClientStatus.NEEDS_HUMAN,
          status: ClientStatus.NEEDS_HUMAN,
          humanRequired: true
        },
        create: {
          clientId: client.id,
          currentStep: ClientStatus.NEEDS_HUMAN,
          status: ClientStatus.NEEDS_HUMAN,
          humanRequired: true
        }
      });
    });

    await KommoService.createTask(client.id, reason);

    return {
      success: true,
      reply: "Certo, vou direcionar você para um atendente humano."
    };
  }

  static async handleKommoAction(input: PublicKommoActionInput) {
    const action = input.action.toUpperCase();
    const payload = input.payload ?? {};
    const phone = input.phone ? normalizePhone(input.phone) : undefined;

    switch (action) {
      case "CHECK_CLIENT": {
        if (!phone) {
          throw new AppError(400, "Telefone é obrigatório para CHECK_CLIENT.");
        }
        const result = await this.clientStatusByPhone(phone);
        if (!result.exists) {
          return {
            success: true,
            reply: "Ainda não encontrei seu cadastro. Posso criar agora com seus dados.",
            data: result
          };
        }
        const foundClient = result.client;
        if (!foundClient) {
          throw new AppError(404, "Cliente não encontrado.");
        }
        return {
          success: true,
          reply: `Encontrei seu cadastro. Seu status atual é ${foundClient.status}.`,
          data: result
        };
      }

      case "LIST_GROUPS": {
        const result = await this.availableGroups();
        const names = result.groups.map((group) => `${group.name} (${group.availableQuotas} cotas disponíveis)`).join("; ");
        return {
          success: true,
          reply: names ? `Temos estes grupos disponíveis: ${names}.` : "No momento não há grupos disponíveis.",
          data: result
        };
      }

      case "LIST_AVAILABLE_QUOTAS": {
        const groupId = String(payload.groupId ?? "");
        if (!groupId) {
          throw new AppError(400, "groupId é obrigatório.");
        }
        const result = await this.availableQuotas(groupId);
        const numbers = result.availableQuotas.slice(0, 30).map((quota) => quota.number).join(", ");
        return {
          success: true,
          reply: numbers ? `Estas cotas estão disponíveis: ${numbers}.` : "Não encontrei cotas disponíveis neste grupo.",
          data: result
        };
      }

      case "CREATE_OR_UPDATE_CLIENT": {
        const clientPhone = String(payload.phone ?? phone ?? "");
        const name = String(payload.name ?? "");
        if (!clientPhone || !name) {
          throw new AppError(400, "name e phone são obrigatórios.");
        }
        const client = await this.createOrUpdateClientFromKommo({
          name,
          phone: clientPhone,
          email: payload.email ? String(payload.email) : undefined,
          cpf: payload.cpf ? String(payload.cpf) : undefined,
          origin: payload.origin ? String(payload.origin) : "KOMMO",
          kommoContactId: input.kommo?.contactId,
          kommoLeadId: input.kommo?.leadId
        });
        return {
          success: true,
          reply: `Cadastro de ${client?.name} atualizado com sucesso.`,
          data: { client }
        };
      }

      case "RESERVE_QUOTA": {
        if (!phone) {
          throw new AppError(400, "Telefone é obrigatório para RESERVE_QUOTA.");
        }
        const groupId = String(payload.groupId ?? "");
        const quotaNumber = Number(payload.quotaNumber);
        if (!groupId || !Number.isInteger(quotaNumber)) {
          throw new AppError(400, "groupId e quotaNumber são obrigatórios.");
        }
        const result = await this.reserveQuota({
          phone,
          groupId,
          quotaNumber,
          kommoContactId: input.kommo?.contactId,
          kommoLeadId: input.kommo?.leadId
        });
        if (!result.success) {
          return {
            success: false,
            reply: result.message,
            data: result
          };
        }
        const reservedQuota = result.quota;
        const payment = result.payment;
        if (!reservedQuota || !payment) {
          throw new AppError(500, "Reserva concluída sem dados de cota ou pagamento.");
        }
        return {
          success: true,
          reply: `Perfeito, sua cota ${reservedQuota.number} foi reservada. Agora falta apenas confirmar o pagamento pelo link: ${payment.paymentLink}`,
          data: result
        };
      }

      case "CREATE_PAYMENT_LINK": {
        if (!phone) {
          throw new AppError(400, "Telefone é obrigatório para CREATE_PAYMENT_LINK.");
        }
        const quotaId = String(payload.quotaId ?? "");
        const groupId = String(payload.groupId ?? "");
        if (!quotaId || !groupId) {
          throw new AppError(400, "quotaId e groupId são obrigatórios.");
        }
        const result = await this.createPaymentLink({ phone, quotaId, groupId });
        return {
          success: true,
          reply: `Aqui está o link para confirmar sua participação: ${result.payment.paymentLink}`,
          data: result
        };
      }

      case "CHECK_PAYMENT_STATUS": {
        if (!phone) {
          throw new AppError(400, "Telefone é obrigatório para CHECK_PAYMENT_STATUS.");
        }
        const client = await findClientByPhone(phone);
        if (!client) {
          return { success: true, reply: "Ainda não encontrei cadastro para este telefone.", data: { exists: false } };
        }
        const payment = await prisma.payment.findFirst({
          where: { clientId: client.id },
          include: { quota: true, group: true },
          orderBy: { createdAt: "desc" }
        });
        if (!payment) {
          return { success: true, reply: "Não encontrei pagamentos para seu cadastro.", data: { clientId: client.id } };
        }
        return {
          success: true,
          reply:
            payment.status === PaymentStatus.PAID
              ? "Seu pagamento já está confirmado. Sua participação está ativa."
              : `Seu pagamento está com status ${payment.status}. Link: ${payment.paymentLink ?? "não disponível"}.`,
          data: { payment }
        };
      }

      case "REQUEST_HUMAN": {
        if (!phone) {
          throw new AppError(400, "Telefone é obrigatório para REQUEST_HUMAN.");
        }
        return this.requestHuman(phone, payload.reason ? String(payload.reason) : undefined);
      }

      default:
        throw new AppError(400, `Action não suportada: ${input.action}`);
    }
  }
}
