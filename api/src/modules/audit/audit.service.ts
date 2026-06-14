import { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";

interface AuditInput {
  userId?: string;
  entity: string;
  entityId?: string;
  action: string;
  description: string;
  payload?: Prisma.InputJsonValue;
}

export class AuditService {
  static async log(input: AuditInput) {
    return prisma.auditLog.create({
      data: {
        userId: input.userId,
        entity: input.entity,
        entityId: input.entityId,
        action: input.action,
        description: input.description,
        payload: input.payload
      }
    });
  }

  static async list() {
    return prisma.auditLog.findMany({
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 300
    });
  }
}
