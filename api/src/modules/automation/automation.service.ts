import { ClientStatus, MessageChannel, MessageDirection } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/http";
import { KommoService } from "../kommo/kommo.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";

const flow: ClientStatus[] = [
  ClientStatus.NEW_LEAD,
  ClientStatus.FIRST_CONTACT_SENT,
  ClientStatus.EXPLANATION_SENT,
  ClientStatus.WAITING_INTEREST_CONFIRMATION,
  ClientStatus.COLLECTING_DATA,
  ClientStatus.WAITING_QUOTA_CHOICE
];

const waitingStatuses = [
  ClientStatus.WAITING_INTEREST_CONFIRMATION,
  ClientStatus.COLLECTING_DATA,
  ClientStatus.WAITING_CPF,
  ClientStatus.WAITING_QUOTA_CHOICE,
  ClientStatus.WAITING_PAYMENT,
  ClientStatus.PAYMENT_LINK_SENT
];

const stepMessages: Partial<Record<ClientStatus, string>> = {
  [ClientStatus.FIRST_CONTACT_SENT]: "Olá! Posso te explicar como funciona o Sorteou Ganhou?",
  [ClientStatus.EXPLANATION_SENT]: "Funciona assim: você escolhe uma cota, realiza o pagamento e participa do sorteio presencial.",
  [ClientStatus.WAITING_INTEREST_CONFIRMATION]: "Você quer participar deste grupo?",
  [ClientStatus.COLLECTING_DATA]: "Perfeito. Envie seus dados principais para seguirmos com a reserva.",
  [ClientStatus.WAITING_QUOTA_CHOICE]: "Agora escolha uma cota disponível para reservarmos para você."
};

function normalizeMessage(message: string) {
  return message
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

async function createEvent(clientId: string, type: string, message?: string, payload?: object) {
  return prisma.automationEvent.create({
    data: {
      clientId,
      type,
      message,
      payload
    }
  });
}

export class AutomationService {
  static async list() {
    return prisma.automation.findMany({
      include: { client: true },
      orderBy: { updatedAt: "desc" }
    });
  }

  static async get(clientId: string) {
    const automation = await prisma.automation.findUnique({
      where: { clientId },
      include: { client: true }
    });

    if (!automation) {
      throw new AppError(404, "Automação não encontrada para este cliente.");
    }

    return automation;
  }

  static async ensure(clientId: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (!client) {
      throw new AppError(404, "Cliente não encontrado.");
    }

    return prisma.automation.upsert({
      where: { clientId },
      update: {},
      create: {
        clientId,
        currentStep: client.status,
        status: client.status
      }
    });
  }

  static async start(clientId: string) {
    await this.ensure(clientId);
    await createEvent(clientId, "STARTED", "Automação iniciada.");
    return this.advance(clientId);
  }

  static async advance(clientId: string) {
    const automation = await this.ensure(clientId);
    const currentStep = automation.currentStep as ClientStatus;
    const currentIndex = flow.indexOf(currentStep);
    const nextStep = currentIndex >= 0 ? flow[Math.min(currentIndex + 1, flow.length - 1)] : ClientStatus.FIRST_CONTACT_SENT;

    await prisma.$transaction(async (tx) => {
      await tx.automation.update({
        where: { clientId },
        data: {
          currentStep: nextStep,
          status: nextStep,
          fallbackCount: 0,
          humanRequired: false,
          finished: nextStep === ClientStatus.PARTICIPANT
        }
      });

      await tx.client.update({
        where: { id: clientId },
        data: { status: nextStep }
      });

      await tx.automationEvent.create({
        data: {
          clientId,
          type: "ADVANCED",
          message: `Fluxo avançou para ${nextStep}.`,
          payload: { from: currentStep, to: nextStep }
        }
      });
    });

    const outbound = stepMessages[nextStep];
    if (outbound) {
      await WhatsAppService.sendMessage(clientId, outbound);
    }
    await KommoService.updateLeadStatus(clientId, nextStep);

    return this.get(clientId);
  }

  static async receiveMessage(clientId: string, message: string) {
    await this.ensure(clientId);

    await prisma.conversationMessage.create({
      data: {
        clientId,
        direction: MessageDirection.INBOUND,
        channel: MessageChannel.WHATSAPP,
        message
      }
    });

    await prisma.automation.update({
      where: { clientId },
      data: { lastResponseAt: new Date() }
    });

    const normalized = normalizeMessage(message);

    if (["humano", "atendente", "falar com alguem", "falar com alguém"].some((keyword) => normalized.includes(keyword))) {
      return this.markHuman(clientId, "Cliente pediu atendimento humano.");
    }

    if (["nao", "não", "depois", "pensar"].some((keyword) => normalized.includes(keyword))) {
      await prisma.$transaction(async (tx) => {
        await tx.client.update({ where: { id: clientId }, data: { status: ClientStatus.COLD } });
        await tx.automation.update({
          where: { clientId },
          data: { currentStep: ClientStatus.COLD, status: ClientStatus.COLD, finished: true }
        });
        await tx.automationEvent.create({
          data: { clientId, type: "COLD", message: "Cliente pediu para deixar para depois." }
        });
      });

      await WhatsAppService.sendMessage(clientId, "Tudo bem. Vou deixar seu contato salvo para retomarmos depois.");
      await KommoService.updateLeadStatus(clientId, ClientStatus.COLD);
      return this.get(clientId);
    }

    if (["sim", "quero", "participar"].some((keyword) => normalized.includes(keyword))) {
      return this.advance(clientId);
    }

    return this.fallback(clientId);
  }

  static async fallback(clientId: string) {
    const automation = await this.ensure(clientId);
    const fallbackCount = automation.fallbackCount + 1;

    if (fallbackCount >= 3) {
      await prisma.automation.update({
        where: { clientId },
        data: { fallbackCount }
      });

      return this.markHuman(clientId, "Fluxo não compreendido após 3 tentativas de fallback.");
    }

    const message =
      fallbackCount === 1
        ? "Ainda consigo te ajudar a participar. Você quer seguir com a reserva?"
        : "Última tentativa por aqui: quer participar ou prefere falar com um atendente?";

    await prisma.$transaction(async (tx) => {
      await tx.automation.update({
        where: { clientId },
        data: { fallbackCount }
      });

      await tx.automationEvent.create({
        data: {
          clientId,
          type: "FALLBACK",
          message,
          payload: { fallbackCount }
        }
      });
    });

    await WhatsAppService.sendMessage(clientId, message);
    return this.get(clientId);
  }

  static async markHuman(clientId: string, reason: string) {
    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: clientId },
        data: { status: ClientStatus.NEEDS_HUMAN }
      });

      await tx.automation.update({
        where: { clientId },
        data: {
          currentStep: ClientStatus.NEEDS_HUMAN,
          status: ClientStatus.NEEDS_HUMAN,
          humanRequired: true,
          finished: false
        }
      });

      await tx.automationEvent.create({
        data: {
          clientId,
          type: "NEEDS_HUMAN",
          message: reason
        }
      });
    });

    await KommoService.createTask(clientId, reason);
    await WhatsAppService.sendMessage(clientId, "Vou chamar um atendente para continuar com você.");
    return this.get(clientId);
  }

  static async runPending() {
    const automations = await prisma.automation.findMany({
      where: {
        finished: false,
        humanRequired: false,
        status: { in: waitingStatuses }
      }
    });

    const results = [];

    for (const automation of automations) {
      results.push(await this.fallback(automation.clientId));
    }

    return {
      processed: results.length,
      results
    };
  }
}
