import { ClientStatus, PaymentStatus, QuotaStatus } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/http";

const blockedDrawStatuses: QuotaStatus[] = [QuotaStatus.WAITING_PAYMENT, QuotaStatus.DEFAULTED, QuotaStatus.RESERVED];

export class ReportService {
  static async dashboard() {
    const [
      totalClients,
      totalGroups,
      totalQuotas,
      activeQuotas,
      availableQuotas,
      reservedQuotas,
      totalReceived,
      totalPending,
      totalOverdue,
      totalWinners,
      clientsNeedingHuman,
      participants
    ] = await Promise.all([
      prisma.client.count(),
      prisma.group.count(),
      prisma.quota.count(),
      prisma.quota.count({ where: { status: QuotaStatus.ACTIVE } }),
      prisma.quota.count({ where: { status: QuotaStatus.AVAILABLE } }),
      prisma.quota.count({ where: { status: QuotaStatus.RESERVED } }),
      prisma.payment.aggregate({ where: { status: PaymentStatus.PAID }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: PaymentStatus.PENDING }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: PaymentStatus.OVERDUE }, _sum: { amount: true } }),
      prisma.client.count({ where: { status: ClientStatus.WINNER } }),
      prisma.client.count({ where: { OR: [{ status: ClientStatus.NEEDS_HUMAN }, { automation: { humanRequired: true } }] } }),
      prisma.client.count({ where: { status: { in: [ClientStatus.PARTICIPANT, ClientStatus.WINNER] } } })
    ]);

    return {
      totalClients,
      totalGroups,
      totalQuotas,
      activeQuotas,
      availableQuotas,
      reservedQuotas,
      totalReceived: totalReceived._sum.amount ?? 0,
      totalPending: totalPending._sum.amount ?? 0,
      totalOverdue: totalOverdue._sum.amount ?? 0,
      totalWinners,
      clientsNeedingHuman,
      conversionLeadToParticipant: totalClients === 0 ? 0 : Number(((participants / totalClients) * 100).toFixed(2))
    };
  }

  static async clients() {
    return prisma.client.findMany({
      include: { automation: true, quotas: true, payments: true },
      orderBy: { createdAt: "desc" }
    });
  }

  static async quotas(groupId: string) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });

    if (!group) {
      throw new AppError(404, "Grupo não encontrado.");
    }

    const byStatus = await prisma.quota.groupBy({
      by: ["status"],
      where: { groupId },
      _count: { _all: true }
    });

    return { group, byStatus };
  }

  static async financial() {
    const byStatus = await prisma.payment.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: { _all: true }
    });

    const latest = await prisma.payment.findMany({
      include: { client: true, group: true, quota: true },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return { byStatus, latest };
  }

  static async drawEligible(groupId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { quotas: { include: { client: true }, orderBy: { number: "asc" } } }
    });

    if (!group) {
      throw new AppError(404, "Grupo não encontrado.");
    }

    const eligibleQuotas = group.quotas.filter((quota) => quota.status === QuotaStatus.ACTIVE);
    const blockedQuotas = group.quotas.filter((quota) => blockedDrawStatuses.includes(quota.status));

    return {
      group,
      eligibleQuotas,
      blockedQuotas,
      eligibleParticipants: eligibleQuotas.map((quota) => quota.client).filter(Boolean),
      totalEligible: eligibleQuotas.length,
      totalBlocked: blockedQuotas.length
    };
  }

  static async winners() {
    return prisma.client.findMany({
      where: { status: ClientStatus.WINNER },
      include: { quotas: { where: { status: QuotaStatus.WINNER }, include: { group: true } }, drawsWon: true },
      orderBy: { updatedAt: "desc" }
    });
  }

  static async funnel() {
    return prisma.client.groupBy({
      by: ["status"],
      _count: { _all: true },
      orderBy: { status: "asc" }
    });
  }

  static async fallbacks() {
    const clients = await prisma.automation.findMany({
      where: { fallbackCount: { gt: 0 } },
      include: { client: true },
      orderBy: { fallbackCount: "desc" }
    });

    const byFallbackCount = await prisma.automation.groupBy({
      by: ["fallbackCount"],
      where: { fallbackCount: { gt: 0 } },
      _count: { _all: true },
      orderBy: { fallbackCount: "asc" }
    });

    const becameHuman = await prisma.automation.count({
      where: { fallbackCount: { gt: 0 }, humanRequired: true }
    });

    return { clients, byFallbackCount, becameHuman };
  }

  static async humanQueue() {
    return prisma.client.findMany({
      where: { OR: [{ status: ClientStatus.NEEDS_HUMAN }, { automation: { humanRequired: true } }] },
      include: {
        automation: true,
        conversationMessages: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: { updatedAt: "desc" }
    });
  }

  static async audit() {
    return prisma.auditLog.findMany({
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 300
    });
  }
}
