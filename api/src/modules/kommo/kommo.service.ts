import { Client, MessageChannel, MessageDirection, Prisma } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/http";

interface KommoIds {
  contactId?: string;
  leadId?: string;
}

interface ContactInput extends KommoIds {
  name: string;
  phone: string;
  email?: string;
}

function mockId(prefix: string, id: string) {
  return `${prefix}_${Date.now()}_${id.slice(0, 8)}`;
}

function integrationMode() {
  return env.KOMMO_BASE_URL && env.KOMMO_ACCESS_TOKEN ? "real_configured" : "mock";
}

function toJson(payload: unknown) {
  return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
}

async function recordKommoEvent(eventType: string, externalId: string | undefined, payload: unknown) {
  return prisma.kommoEvent.create({
    data: {
      eventType,
      externalId,
      payload: toJson({ mode: integrationMode(), ...((payload as object) ?? {}) })
    }
  });
}

async function recordKommoMessage(clientId: string, message: string, payload?: unknown) {
  return prisma.conversationMessage.create({
    data: {
      clientId,
      direction: MessageDirection.OUTBOUND,
      channel: MessageChannel.KOMMO,
      message,
      payload: payload ? toJson(payload) : undefined
    }
  });
}

export class KommoService {
  static async createOrUpdateContact(clientId: string, input: ContactInput) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (!client) {
      throw new AppError(404, "Cliente não encontrado.");
    }

    const kommoContactId = input.contactId ?? client.kommoContactId ?? mockId("contact", client.id);
    const kommoLeadId = input.leadId ?? client.kommoLeadId;

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        kommoContactId,
        kommoLeadId
      }
    });

    await recordKommoEvent("KOMMO_CONTACT_UPSERT", kommoContactId, {
      clientId,
      kommoContactId,
      kommoLeadId,
      name: input.name,
      phone: input.phone,
      email: input.email
    });

    await recordKommoMessage(clientId, `Contato Kommo sincronizado: ${kommoContactId}`);

    return updated;
  }

  static async createLead(client: Client, ids?: KommoIds) {
    const kommoContactId = ids?.contactId ?? client.kommoContactId ?? mockId("contact", client.id);
    const kommoLeadId = ids?.leadId ?? client.kommoLeadId ?? mockId("lead", client.id);

    const updated = await prisma.client.update({
      where: { id: client.id },
      data: { kommoContactId, kommoLeadId }
    });

    await recordKommoEvent("KOMMO_LEAD_UPSERT", kommoLeadId, {
      clientId: client.id,
      kommoContactId,
      kommoLeadId
    });

    await recordKommoMessage(client.id, `Lead Kommo sincronizado: ${kommoLeadId}`);

    return updated;
  }

  static async updateLeadStatus(clientId: string, status: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (!client) {
      throw new AppError(404, "Cliente não encontrado.");
    }

    await recordKommoEvent("KOMMO_LEAD_STATUS_UPDATED", client.kommoLeadId ?? undefined, {
      clientId,
      status
    });

    return recordKommoMessage(clientId, `Status Kommo atualizado: ${status}`);
  }

  static async updateLeadCustomFields(clientId: string, fields: Record<string, unknown>) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (!client) {
      throw new AppError(404, "Cliente não encontrado.");
    }

    await recordKommoEvent("KOMMO_LEAD_CUSTOM_FIELDS_UPDATED", client.kommoLeadId ?? undefined, {
      clientId,
      fields
    });

    return recordKommoMessage(clientId, "Campos personalizados Kommo atualizados.", fields);
  }

  static async addLeadNote(clientId: string, note: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (!client) {
      throw new AppError(404, "Cliente não encontrado.");
    }

    await recordKommoEvent("KOMMO_LEAD_NOTE_ADDED", client.kommoLeadId ?? undefined, {
      clientId,
      note
    });

    return recordKommoMessage(clientId, `Nota Kommo: ${note}`);
  }

  static async createTask(clientId: string, reason: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (!client) {
      throw new AppError(404, "Cliente não encontrado.");
    }

    const taskId = mockId("task", clientId);

    await recordKommoEvent("KOMMO_TASK_CREATED", taskId, {
      clientId,
      leadId: client.kommoLeadId,
      reason,
      taskId
    });

    return recordKommoMessage(clientId, `Tarefa Kommo criada: ${reason}`);
  }

  static async receiveWebhook(payload: Prisma.InputJsonValue) {
    const data = payload as { eventType?: string; externalId?: string };

    return prisma.kommoEvent.create({
      data: {
        eventType: data.eventType ?? "WEBHOOK_RECEIVED",
        externalId: data.externalId,
        payload
      }
    });
  }

  static async saveWebhook(payload: Prisma.InputJsonValue) {
    return this.receiveWebhook(payload);
  }
}
