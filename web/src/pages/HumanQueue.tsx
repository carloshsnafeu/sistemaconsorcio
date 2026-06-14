import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, RefreshCw } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { Client } from "../types";
import { formatDate } from "../utils/format";

export function HumanQueue() {
  const [clients, setClients] = useState<Client[]>([]);

  async function load() {
    const response = await api.get<Client[]>("/reports/human-queue");
    setClients(response.data);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Fila Humana</h2>
          <p className="text-sm text-slate-500">Clientes marcados para atendimento manual.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm">
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      <DataTable
        data={clients}
        columns={[
          { header: "Cliente", render: (client) => <Link className="font-semibold text-brand" to={`/clients/${client.id}`}>{client.name}</Link> },
          { header: "Telefone", render: (client) => client.phone },
          { header: "Status", render: (client) => <StatusBadge status={client.status} /> },
          { header: "Fallbacks", render: (client) => client.automation?.fallbackCount ?? 0 },
          {
            header: "Última mensagem",
            render: (client) => (
              <div className="flex items-center gap-2">
                <MessageCircle size={15} className="text-slate-500" />
                <span>{client.conversationMessages?.[0]?.message ?? "-"}</span>
              </div>
            )
          },
          { header: "Atualizado", render: (client) => formatDate(client.updatedAt) }
        ]}
      />
    </div>
  );
}
