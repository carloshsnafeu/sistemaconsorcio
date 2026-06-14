import { MessageChannel, MessageDirection, Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/http";

export class WhatsAppService {
  static async sendMessage(clientId: string, message: string, payload?: Prisma.InputJsonValue) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (!client) {
      throw new AppError(404, "Cliente não encontrado.");
    }

    const record = await prisma.conversationMessage.create({
      data: {
        clientId,
        direction: MessageDirection.OUTBOUND,
        channel: MessageChannel.WHATSAPP,
        message,
        payload
      }
    });

    await prisma.automation.updateMany({
      where: { clientId },
      data: { lastMessageAt: new Date() }
    });

    return { success: true, message: record };
  }
}
