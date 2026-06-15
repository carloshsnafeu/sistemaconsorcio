import { Router, Request, Response } from "express";

const router = Router();

/**
 * Endpoint ponte para o Salesbot da Kommo.
 *
 * Por que ele existe?
 * - O Salesbot/widget_request da Kommo não chama sua rota /api/public/kommo/action
 *   com header x-api-key.
 * - Ele envia um POST com este formato:
 *   {
 *     token: "...",
 *     data: {...},
 *     return_url: "..."
 *   }
 *
 * Então esta rota:
 * 1. Recebe a chamada da Kommo.
 * 2. Valida a chave enviada dentro de data.publicApiKey.
 * 3. Chama internamente sua rota oficial /api/public/kommo/action.
 * 4. Envia a resposta de volta para a Kommo usando return_url.
 */

type KommoSalesbotBody = {
  token?: string;
  return_url?: string;
  data?: {
    publicApiKey?: string;
    action?: string;
    phone?: string;
    leadId?: string;
    contactId?: string;
    groupId?: string;
    quotaNumber?: string | number;
    [key: string]: any;
  };
};

const fetchFn = (globalThis as any).fetch as
  | undefined
  | ((url: string, init?: any) => Promise<any>);

function onlyDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizePhone(value: unknown): string {
  return onlyDigits(value);
}

function parseQuotaNumber(value: unknown): number | null {
  const digits = onlyDigits(value);
  if (!digits) return null;

  const number = Number(digits);
  if (!Number.isFinite(number) || number <= 0) return null;

  return number;
}

function getInternalActionUrl(): string {
  return (
    process.env.KOMMO_ACTION_INTERNAL_URL ||
    `http://127.0.0.1:${process.env.PORT || 3333}/api/public/kommo/action`
  );
}

function buildFallbackReply(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Erro desconhecido na integração.";

  console.error("[Kommo Salesbot] Erro:", message);

  return (
    "Tive uma dificuldade para consultar o sistema agora. " +
    "Vou encaminhar você para um atendente para continuar o atendimento. 🤝"
  );
}

async function callInternalKommoAction(data: NonNullable<KommoSalesbotBody["data"]>) {
  if (!fetchFn) {
    throw new Error("fetch não está disponível no Node.js. Use Node 20+.");
  }

  const action = String(data.action || "").trim();

  if (!action) {
    throw new Error("Ação não informada pelo Salesbot.");
  }

  const publicApiKey = String(data.publicApiKey || "").trim();

  if (!publicApiKey) {
    throw new Error("publicApiKey não enviada pelo Salesbot.");
  }

  if (process.env.PUBLIC_API_KEY && publicApiKey !== process.env.PUBLIC_API_KEY) {
    throw new Error("publicApiKey inválida.");
  }

  const phone = normalizePhone(data.phone);

  const payload: Record<string, any> = {};

  if (action === "RESERVE_QUOTA") {
    const quotaNumber = parseQuotaNumber(data.quotaNumber);

    if (!data.groupId) {
      throw new Error("groupId não enviado para reserva de cota.");
    }

    if (!quotaNumber) {
      throw new Error("Número de cota inválido.");
    }

    payload.groupId = data.groupId;
    payload.quotaNumber = quotaNumber;
  }

  const body = {
    action,
    phone,
    payload,
    kommo: {
      leadId: data.leadId || null,
      contactId: data.contactId || null,
    },
  };

  const response = await fetchFn(getInternalActionUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": publicApiKey,
    },
    body: JSON.stringify(body),
  });

  let result: any = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      result?.message ||
        result?.error ||
        `Erro HTTP ${response.status} ao chamar /api/public/kommo/action.`
    );
  }

  return result;
}

async function continueSalesbot(
  returnUrl: string,
  reply: string,
  nextAction: "ASK_QUOTA" | "FINISH" | "HUMAN"
) {
  if (!fetchFn) {
    throw new Error("fetch não está disponível no Node.js. Use Node 20+.");
  }

  if (!returnUrl || !/^https:\/\/.+/i.test(returnUrl)) {
    throw new Error("return_url inválida ou ausente.");
  }

  const executeHandlers: any[] = [
    {
      handler: "show",
      params: {
        type: "text",
        value: reply,
      },
    },
  ];

  if (nextAction === "ASK_QUOTA") {
    executeHandlers.push({
      handler: "goto",
      params: {
        type: "question",
        step: 2,
      },
    });
  }

  if (nextAction === "HUMAN") {
    executeHandlers.push({
      handler: "goto",
      params: {
        type: "question",
        step: 4,
      },
    });
  }

  if (nextAction === "FINISH") {
    executeHandlers.push({
      handler: "goto",
      params: {
        type: "finish",
        step: 99,
      },
    });
  }

  const response = await fetchFn(returnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        reply,
        status: nextAction === "HUMAN" ? "fail" : "success",
      },
      execute_handlers: executeHandlers,
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao continuar Salesbot. HTTP ${response.status}`);
  }
}

async function processSalesbotRequest(body: KommoSalesbotBody) {
  const data = body.data || {};
  const returnUrl = body.return_url || "";
  const action = String(data.action || "").trim();

  try {
    const result = await callInternalKommoAction(data);

    const reply =
      result?.reply ||
      "Consulta realizada com sucesso, mas o sistema não retornou uma mensagem.";

    if (action === "LIST_GROUPS") {
      await continueSalesbot(returnUrl, reply, "ASK_QUOTA");
      return;
    }

    if (action === "RESERVE_QUOTA") {
      await continueSalesbot(returnUrl, reply, "FINISH");
      return;
    }

    await continueSalesbot(returnUrl, reply, "FINISH");
  } catch (error) {
    const fallbackReply = buildFallbackReply(error);

    try {
      await continueSalesbot(returnUrl, fallbackReply, "HUMAN");
    } catch (continueError) {
      console.error("[Kommo Salesbot] Erro ao retornar para Kommo:", continueError);
    }
  }
}

router.post("/salesbot", async (req: Request, res: Response) => {
  /**
   * A Kommo precisa receber 200 rápido.
   * Por isso respondemos primeiro e continuamos o processamento em segundo plano.
   */
  res.status(200).json({
    ok: true,
    received: true,
  });

  void processSalesbotRequest(req.body as KommoSalesbotBody);
});

export default router;