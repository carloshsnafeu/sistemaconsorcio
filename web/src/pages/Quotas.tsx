import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, TicketCheck } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { Client, Group, Quota, QuotaStatus } from "../types";
import { getErrorMessage } from "../utils/format";

const quotaStatuses: QuotaStatus[] = ["AVAILABLE", "RESERVED", "WAITING_PAYMENT", "ACTIVE", "DEFAULTED", "WINNER", "CANCELLED"];

const quotaClass: Record<QuotaStatus, string> = {
  AVAILABLE: "border-emerald-200 bg-emerald-50 text-emerald-900",
  RESERVED: "border-orange-200 bg-orange-50 text-orange-900",
  WAITING_PAYMENT: "border-amber-200 bg-amber-50 text-amber-900",
  ACTIVE: "border-teal-200 bg-teal-50 text-teal-900",
  DEFAULTED: "border-red-200 bg-red-50 text-red-900",
  WINNER: "border-yellow-300 bg-yellow-50 text-yellow-900",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-700"
};

export function Quotas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [groups, setGroups] = useState<Group[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [selectedQuota, setSelectedQuota] = useState<Quota | null>(null);
  const [selectedClient, setSelectedClient] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const selectedGroupId = searchParams.get("groupId") ?? "";

  async function loadBase() {
    const [groupResponse, clientResponse] = await Promise.all([api.get<Group[]>("/groups"), api.get<Client[]>("/clients")]);
    setGroups(groupResponse.data);
    setClients(clientResponse.data);
    if (!selectedGroupId && groupResponse.data[0]) {
      setSearchParams({ groupId: groupResponse.data[0].id });
    }
  }

  async function loadQuotas() {
    if (!selectedGroupId) {
      return;
    }
    const response = await api.get<Quota[]>("/quotas", { params: { groupId: selectedGroupId, ...(status ? { status } : {}) } });
    setQuotas(response.data);
  }

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    loadQuotas();
  }, [selectedGroupId, status]);

  const selectedGroup = useMemo(() => groups.find((group) => group.id === selectedGroupId), [groups, selectedGroupId]);

  async function reserve() {
    if (!selectedQuota || !selectedClient) {
      return;
    }
    setMessage("");
    try {
      await api.post(`/quotas/${selectedQuota.id}/reserve`, { clientId: selectedClient });
      setSelectedQuota(null);
      setSelectedClient("");
      await loadQuotas();
      setMessage("Cota reservada e pagamento mock gerado.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Cotas</h2>
          <p className="text-sm text-slate-500">{selectedGroup?.name ?? "Selecione um grupo"}</p>
        </div>
        <button onClick={loadQuotas} className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm">
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select className="rounded-md border border-line bg-white px-3 py-2 text-sm" value={selectedGroupId} onChange={(event) => setSearchParams({ groupId: event.target.value })}>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <select className="rounded-md border border-line bg-white px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos os status</option>
          {quotaStatuses.map((item) => (
            <option key={item} value={item}>
              {item.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {message && <p className="rounded-md bg-white px-3 py-2 text-sm text-slate-600">{message}</p>}

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-line bg-white p-4 sm:grid-cols-6 md:grid-cols-9 xl:grid-cols-12">
          {quotas.map((quota) => (
            <button
              key={quota.id}
              onClick={() => setSelectedQuota(quota)}
              className={`aspect-square rounded-md border text-sm font-semibold transition hover:scale-[1.02] ${quotaClass[quota.status]}`}
              title={`${quota.number} - ${quota.status}`}
            >
              {quota.number}
            </button>
          ))}
        </div>

        <aside className="rounded-lg border border-line bg-white p-5">
          <h3 className="mb-4 font-semibold">Reserva</h3>
          {selectedQuota ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Cota selecionada</p>
                <div className="mt-1 flex items-center gap-2">
                  <strong className="text-xl">{selectedQuota.number}</strong>
                  <StatusBadge status={selectedQuota.status} />
                </div>
              </div>
              <select className="w-full rounded-md border border-line px-3 py-2 text-sm" value={selectedClient} onChange={(event) => setSelectedClient(event.target.value)}>
                <option value="">Cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} - {client.phone}
                  </option>
                ))}
              </select>
              <button onClick={reserve} disabled={selectedQuota.status !== "AVAILABLE"} className="flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                <TicketCheck size={16} />
                Reservar cota
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Clique em uma cota para visualizar ou reservar.</p>
          )}
        </aside>
      </section>
    </div>
  );
}
