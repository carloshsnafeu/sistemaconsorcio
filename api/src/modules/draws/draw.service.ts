import { ClientStatus, DrawStatus, QuotaStatus } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/http";
import { AuditService } from "../audit/audit.service";
import { KommoService } from "../kommo/kommo.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";

interface DrawInput {
  groupId: string;
  title: string;
  drawDate: Date;
  notes?: string;
  createdById?: string;
}

export class DrawService {
  static async list() {
    return prisma.draw.findMany({
      include: { group: true, winningClient: true, winningQuota: true, createdBy: true },
      orderBy: { drawDate: "desc" }
    });
  }

  static async get(id: string) {
    const draw = await prisma.draw.findUnique({
      where: { id },
      include: { group: true, winningClient: true, winningQuota: true, createdBy: true }
    });

    if (!draw) {
      throw new AppError(404, "Sorteio não encontrado.");
    }

    return draw;
  }

  static async create(data: DrawInput) {
    return prisma.draw.create({
      data: {
        groupId: data.groupId,
        title: data.title,
        drawDate: data.drawDate,
        notes: data.notes,
        createdById: data.createdById
      },
      include: { group: true }
    });
  }

  static async registerResult(drawId: string, drawnNumber: number, userId?: string) {
    const draw = await this.get(drawId);

    if (draw.status === DrawStatus.DONE) {
      throw new AppError(409, "Resultado deste sorteio já foi registrado.");
    }

    const quota = await prisma.quota.findUnique({
      where: { groupId_number: { groupId: draw.groupId, number: drawnNumber } },
      include: { client: true, group: true }
    });

    if (!quota) {
      throw new AppError(404, "Número sorteado não existe neste grupo.");
    }

    if (quota.status !== QuotaStatus.ACTIVE || !quota.clientId) {
      return {
        eligible: false,
        message: `Número ${drawnNumber} não está apto. Status atual: ${quota.status}.`,
        quota
      };
    }

    const winningClientId = quota.clientId;

    const result = await prisma.$transaction(async (tx) => {
      const updatedDraw = await tx.draw.update({
        where: { id: drawId },
        data: {
          status: DrawStatus.DONE,
          drawnNumber,
          winningQuotaId: quota.id,
          winningClientId
        },
        include: { group: true, winningClient: true, winningQuota: true }
      });

      await tx.quota.update({
        where: { id: quota.id },
        data: { status: QuotaStatus.WINNER }
      });

      await tx.client.update({
        where: { id: winningClientId },
        data: { status: ClientStatus.WINNER }
      });

      return updatedDraw;
    });

    await AuditService.log({
      userId,
      entity: "Draw",
      entityId: drawId,
      action: "REGISTER_RESULT",
      description: `Número ${drawnNumber} registrado como contemplado.`,
      payload: { winningQuotaId: quota.id, winningClientId }
    });

    await KommoService.addLeadNote(winningClientId, `Cliente contemplado no sorteio ${draw.title}.`);
    await WhatsAppService.sendMessage(
      winningClientId,
      `Parabéns! Sua cota ${quota.number} foi contemplada no sorteio ${draw.title}.`
    );

    return {
      eligible: true,
      message: "Resultado registrado com sucesso.",
      draw: result
    };
  }
}
