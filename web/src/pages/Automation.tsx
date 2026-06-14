import { useEffect, useState } from "react";
import { Bot, FastForward, MessageSquare, RefreshCw, RotateCcw, Send } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { Automation as AutomationType } from "../types";
import { formatDate, getErrorMessage } from "../utils/format";

export function Automation() {
  const [automations, setAutomations] = useState<AutomationType[]>([]);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  async function load() {
    const response = await api.get<AutomationType[]>("/automation");
    setAutomations(response.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function run(action: () => Promise<unknown>, success: string) {
    setNotice("");
    try {
      await action();
      await load();
      setNotice(success);
    } catch (error) {
      setNotice(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Automação</h2>
          <p className="text-sm text-slate-500">Fluxos, fallbacks e mensagens simuladas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm">
            <RefreshCw size={16} />
            Atualizar
          </button>
          <button onClick={() => run(() => api.post("/automation/run-pending"), "Pendências processadas.")} className="flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white">
            <Bot size={16} />
            Rodar pendências
          </button>
        </div>
      </div>

      {notice && <p className="rounded-md bg-white px-3 py-2 text-sm text-slate-600">{notice}</p>}

      <DataTable
        data={automations}
        columns={[
          { header: "Cliente", render: (automation) => automation.client?.name ?? automation.clientId },
          { header: "Status", render: (automation) => <StatusBadge status={automation.status} /> },
          { header: "Etapa", render: (automation) => automation.currentStep },
          { header: "Fallbacks", render: (automation) => automation.fallbackCount },
          { header: "Humano", render: (automation) => (automation.humanRequired ? "Sim" : "Não") },
          { header: "Atualizado", render: (automation) => formatDate((automation as AutomationType & { updatedAt?: string }).updatedAt) },
          {
            header: "Ações",
            render: (automation) => (
              <div className="flex min-w-80 flex-wrap items-center gap-2">
                <button onClick={() => run(() => api.post(`/automation/${automation.clientId}/start`), "Automação iniciada.")} className="rounded-md border border-line p-2" title="Iniciar">
                  <Bot size={15} />
                </button>
                <button onClick={() => run(() => api.post(`/automation/${automation.clientId}/advance`), "Fluxo avançado.")} className="rounded-md border border-line p-2" title="Avançar">
                  <FastForward size={15} />
                </button>
                <button onClick={() => run(() => api.post(`/automation/${automation.clientId}/fallback`), "Fallback registrado.")} className="rounded-md border border-line p-2" title="Fallback">
                  <RotateCcw size={15} />
                </button>
                <div className="flex items-center gap-1">
                  <MessageSquare size={15} className="text-slate-500" />
                  <input
                    className="w-36 rounded-md border border-line px-2 py-1 text-xs"
                    placeholder="Mensagem"
                    value={messages[automation.clientId] ?? ""}
                    onChange={(event) => setMessages((current) => ({ ...current, [automation.clientId]: event.target.value }))}
                  />
                  <button
                    onClick={() =>
                      run(
                        () => api.post(`/automation/${automation.clientId}/receive-message`, { message: messages[automation.clientId] }),
                        "Mensagem recebida."
                      )
                    }
                    className="rounded-md border border-line p-2"
                    title="Enviar mensagem"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            )
          }
        ]}
      />
    </div>
  );
}
