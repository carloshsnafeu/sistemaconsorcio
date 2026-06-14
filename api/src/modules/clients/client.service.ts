import { ClientStatus, Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { AuditService } from "../audit/audit.service";
import { KommoService } from "../kommo/kommo.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import { AppError } from "../../utils/http";

export interface ClientInput {
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  origin?: string;
  notes?: string;
}

const clientDetailInclude = {
  automation: true,
  automationEvents: { orderBy: { createdAt: "desc" as const }, take: 50 },
  conversationMessages: { orderBy: { createdAt: "asc" as const } },
  quotas: { include: { group: true }, orderBy: { createdAt: "desc" as const } },
  payments: { include: { group: true, quota: true }, orderBy: { createdAt: "desc" as const } },
  drawsWon: { include: { group: true }, orderBy: { createdAt: "desc" as const } }
};

export class ClientService {
  static async list(status?: ClientStatus) {
    return prisma.client.findMany({
      where: status ? { status } : undefined,
      include: { automation: true },
      orderBy: { createdAt: "desc" }
    });
  }

  static async get(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: clientDetailInclude
    });

    if (!client) {
      throw new AppError(404, "Cliente não encontrado.");
    }

    return client;
  }

  static async create(data: ClientInput, userId?: string) {
    const client = await prisma.client.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        cpf: data.cpf,
        origin: data.origin,
        notes: data.notes,
        status: ClientStatus.NEW_LEAD
      }
    });

    await AuditService.log({
      userId,
      entity: "Client",
      entityId: client.id,
      action: "CREATE",
      description: "Cliente criado manualmente.",
      payload: { origin: data.origin ?? "manual" }
    });

    return this.get(client.id);
  }

  static async fromLanding(data: ClientInput) {
    const client = await prisma.client.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        cpf: data.cpf,
        origin: data.origin ?? "landing_page",
        notes: data.notes,
        status: ClientStatus.NEW_LEAD,
        automation: {
          create: {
            currentStep: ClientStatus.NEW_LEAD,
            status: ClientStatus.NEW_LEAD
          }
        }
      }
    });

    await AuditService.log({
      entity: "Client",
      entityId: client.id,
      action: "LANDING_LEAD_CREATED",
      description: "Lead recebido pela landing page simulada.",
      payload: { phone: client.phone, origin: client.origin } as Prisma.InputJsonValue
    });

    await KommoService.createLead(client);
    await WhatsAppService.sendMessage(
      client.id,
      `Olá, ${client.name}! Recebemos seu cadastro no Sorteou Ganhou. Posso te explicar como participar?`
    );

    await prisma.automationEvent.create({
      data: {
        clientId: client.id,
        type: "LANDING_FLOW_STARTED",
        message: "Lead criado, Kommo mock acionado e primeira mensagem enviada."
      }
    });

    return this.get(client.id);
  }

  static async update(id: string, data: Partial<ClientInput> & { status?: ClientStatus }) {
    await this.get(id);

    await prisma.client.update({
      where: { id },
      data
    });

    return this.get(id);
  }
}
