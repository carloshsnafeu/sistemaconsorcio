import { Client, MessageChannel, MessageDirection, Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/http";

function mockId(prefix: string, id: string) {
  return `${prefix}_${Date.now()}_${id.slice(0, 8)}`;
}

export class KommoService {
  static async createLead(client: Client) {
    const kommoContactId = mockId("contact", client.id);
    const kommoLeadId = mockId("lead", client.id);

    const updated = await prisma.client.update({
      where: { id: client.id },
      data: { kommoContactId, kommoLeadId }
    });

    await prisma.kommoEvent.create({
      data: {
        eventType: "MOCK_LEAD_CREATED",
        externalId: kommoLeadId,
        payload: { clientId: client.id, kommoContactId, kommoLeadId }
      }
    });

    await prisma.conversationMessage.create({
      data: {
        clientId: client.id,
        direction: MessageDirection.OUTBOUND,
        channel: MessageChannel.KOMMO,
        message: `Lead mock criado no Kommo: ${kommoLeadId}`
      }
    });

    return updated;
  }

  static async updateLeadStatus(clientId: string, status: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (!client) {
      throw new AppError(404, "Cliente não encontrado.");
    }

    await prisma.kommoEvent.create({
      data: {
        eventType: "MOCK_STATUS_UPDATED",
        externalId: client.kommoLeadId,
        payload: { clientId, status }
      }
    });

    return prisma.conversationMessage.create({
      data: {
        clientId,
        direction: MessageDirection.OUTBOUND,
        channel: MessageChannel.KOMMO,
        message: `Status mock atualizado no Kommo: ${status}`
      }
    });
  }

  static async addLeadNote(clientId: string, note: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (!client) {
      throw new AppError(404, "Cliente não encontrado.");
    }

    await prisma.kommoEvent.create({
      data: {
        eventType: "MOCK_NOTE_ADDED",
        externalId: client.kommoLeadId,
        payload: { clientId, note }
      }
    });

    return prisma.conversationMessage.create({
      data: {
        clientId,
        direction: MessageDirection.OUTBOUND,
        channel: MessageChannel.KOMMO,
        message: `Nota mock no Kommo: ${note}`
      }
    });
  }

  static async createTask(clientId: string, reason: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (!client) {
      throw new AppError(404, "Cliente não encontrado.");
    }

    const taskId = mockId("task", clientId);

    await prisma.kommoEvent.create({
      data: {
        eventType: "MOCK_TASK_CREATED",
        externalId: taskId,
        payload: { clientId, reason, taskId }
      }
    });

    return prisma.conversationMessage.create({
      data: {
        clientId,
        direction: MessageDirection.OUTBOUND,
        channel: MessageChannel.KOMMO,
        message: `Tarefa mock criada no Kommo: ${reason}`
      }
    });
  }

  static async saveWebhook(payload: Prisma.InputJsonValue) {
    const data = payload as { eventType?: string; externalId?: string };

    return prisma.kommoEvent.create({
      data: {
        eventType: data.eventType ?? "WEBHOOK_RECEIVED",
        externalId: data.externalId,
        payload
      }
    });
  }
}
