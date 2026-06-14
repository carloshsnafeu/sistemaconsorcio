import { GroupStatus, Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/http";
import { AuditService } from "../audit/audit.service";

export interface GroupInput {
  name: string;
  description?: string;
  quotaValue: number;
  quotaQuantity: number;
  prizeValue?: number;
  prizeDescription?: string;
  status?: GroupStatus;
  startDate?: Date;
  endDate?: Date;
}

export class GroupService {
  static async list() {
    return prisma.group.findMany({
      include: {
        _count: { select: { quotas: true, payments: true, draws: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  static async get(id: string) {
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        quotas: { include: { client: true }, orderBy: { number: "asc" } },
        draws: { orderBy: { drawDate: "desc" } },
        payments: { include: { client: true, quota: true }, orderBy: { createdAt: "desc" } }
      }
    });

    if (!group) {
      throw new AppError(404, "Grupo não encontrado.");
    }

    return group;
  }

  static async create(data: GroupInput, userId?: string) {
    const group = await prisma.group.create({
      data: {
        name: data.name,
        description: data.description,
        quotaValue: data.quotaValue,
        quotaQuantity: data.quotaQuantity,
        prizeValue: data.prizeValue,
        prizeDescription: data.prizeDescription,
        status: data.status ?? GroupStatus.OPEN,
        startDate: data.startDate,
        endDate: data.endDate
      }
    });

    await AuditService.log({
      userId,
      entity: "Group",
      entityId: group.id,
      action: "CREATE",
      description: "Grupo criado.",
      payload: { quotaQuantity: group.quotaQuantity, quotaValue: group.quotaValue.toString() } as Prisma.InputJsonValue
    });

    return group;
  }

  static async generateQuotas(groupId: string, userId?: string) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });

    if (!group) {
      throw new AppError(404, "Grupo não encontrado.");
    }

    const existing = await prisma.quota.count({ where: { groupId } });

    if (existing > 0) {
      return {
        created: 0,
        message: "Cotas já foram geradas para este grupo.",
        quotas: await prisma.quota.findMany({ where: { groupId }, orderBy: { number: "asc" } })
      };
    }

    const data = Array.from({ length: group.quotaQuantity }, (_, index) => ({
      groupId,
      number: index + 1
    }));

    const result = await prisma.quota.createMany({ data, skipDuplicates: true });

    await AuditService.log({
      userId,
      entity: "Group",
      entityId: groupId,
      action: "GENERATE_QUOTAS",
      description: `${result.count} cotas geradas automaticamente.`,
      payload: { quotaQuantity: group.quotaQuantity }
    });

    return {
      created: result.count,
      message: `${result.count} cotas geradas.`,
      quotas: await prisma.quota.findMany({ where: { groupId }, orderBy: { number: "asc" } })
    };
  }
}
