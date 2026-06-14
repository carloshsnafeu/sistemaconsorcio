import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bot, MessageSquare } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { Client } from "../types";
import { formatDate, formatMoney } from "../utils/format";

export function ClientDetails() {
  const { id } = useParams();
  const [client, setClient] = useState<Client | null>(null);

  async function load() {
    if (!id) {
      return;
    }
    const response = await api.get<Client>(`/clients/${id}`);
    setClient(response.data);
  }

  useEffect(() => {
    load();
  }, [id]);

  if (!client) {
    return <p className="text-sm text-slate-500">Carregando cliente...</p>;
  }

  return (
    <div className="space-y-6">
      <Link to="/clients" className="inline-flex items-center gap-2 text-sm font-medium text-brand">
        <ArrowLeft size={16} />
        Clientes
      </Link>
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-ink">{client.name}</h2>
            <p className="text-sm text-slate-500">{client.phone} {client.email ? `• ${client.email}` : ""}</p>
          </div>
          <StatusBadge status={client.status} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div><p className="text-xs text-slate-500">CPF</p><p className="font-medium">{client.cpf ?? "-"}</p></div>
          <div><p className="text-xs text-slate-500">Origem</p><p className="font-medium">{client.origin ?? "-"}</p></div>
          <div><p className="text-xs text-slate-500">Kommo Lead</p><p className="font-medium">{client.kommoLeadId ?? "-"}</p></div>
          <div><p className="text-xs text-slate-500">Criado</p><p className="font-medium">{formatDate(client.createdAt)}</p></div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-brand" />
            <h3 className="font-semibold">Conversa</h3>
          </div>
          <div className="max-h-96 space-y-3 overflow-y-auto pr-2">
            {(client.conversationMessages ?? []).map((message) => (
              <div key={message.id} className={`rounded-md border border-line p-3 ${message.direction === "INBOUND" ? "bg-sky-50" : "bg-slate-50"}`}>
                <div className="flex justify-between gap-3 text-xs text-slate-500">
                  <span>{message.channel} • {message.direction}</span>
                  <span>{formatDate(message.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm">{message.message}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bot size={18} className="text-brand" />
            <h3 className="font-semibold">Automação</h3>
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <p>Status: <strong>{client.automation?.status ?? "-"}</strong></p>
            <p>Etapa: <strong>{client.automation?.currentStep ?? "-"}</strong></p>
            <p>Fallbacks: <strong>{client.automation?.fallbackCount ?? 0}</strong></p>
            <p>Humano: <strong>{client.automation?.humanRequired ? "Sim" : "Não"}</strong></p>
          </div>
          <div className="mt-5 space-y-2">
            {(client.automationEvents ?? []).map((event) => (
              <div key={event.id} className="rounded-md bg-slate-50 px-3 py-2 text-sm">
                <strong>{event.type}</strong> {event.message ? `• ${event.message}` : ""} <span className="text-xs text-slate-500">{formatDate(event.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div>
          <h3 className="mb-3 font-semibold">Cotas</h3>
          <DataTable
            data={client.quotas ?? []}
            columns={[
              { header: "Grupo", render: (quota) => quota.group?.name ?? "-" },
              { header: "Número", render: (quota) => quota.number },
              { header: "Status", render: (quota) => <StatusBadge status={quota.status} /> }
            ]}
          />
        </div>
        <div>
          <h3 className="mb-3 font-semibold">Pagamentos</h3>
          <DataTable
            data={client.payments ?? []}
            columns={[
              { header: "Grupo", render: (payment) => payment.group?.name ?? "-" },
              { header: "Valor", render: (payment) => formatMoney(payment.amount) },
              { header: "Status", render: (payment) => <StatusBadge status={payment.status} /> }
            ]}
          />
        </div>
      </section>
    </div>
  );
}
