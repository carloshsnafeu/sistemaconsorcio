import { useEffect, useState } from "react";
import { BarChart3, Crown, DollarSign, MessageCircle, RefreshCw, Ticket } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { Client, Group, Payment, Quota } from "../types";
import { formatMoney } from "../utils/format";

interface DashboardReport {
  totalClients: number;
  totalGroups: number;
  totalQuotas: number;
  activeQuotas: number;
  totalReceived: string | number;
  totalPending: string | number;
  clientsNeedingHuman: number;
  totalWinners: number;
}

interface FunnelItem {
  status: string;
  _count: { _all: number };
}

interface FinancialReport {
  byStatus: Array<{ status: string; _sum: { amount: string | number | null }; _count: { _all: number } }>;
  latest: Payment[];
}

interface FallbackReport {
  clients: Array<{ id: string; fallbackCount: number; humanRequired: boolean; client: Client }>;
  byFallbackCount: Array<{ fallbackCount: number; _count: { _all: number } }>;
  becameHuman: number;
}

interface EligibleReport {
  group: Group;
  eligibleQuotas: Quota[];
  blockedQuotas: Quota[];
  totalEligible: number;
  totalBlocked: number;
}

export function Reports() {
  const [dashboard, setDashboard] = useState<DashboardReport | null>(null);
  const [financial, setFinancial] = useState<FinancialReport | null>(null);
  const [funnel, setFunnel] = useState<FunnelItem[]>([]);
  const [fallbacks, setFallbacks] = useState<FallbackReport | null>(null);
  const [humanQueue, setHumanQueue] = useState<Client[]>([]);
  const [winners, setWinners] = useState<Client[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [eligible, setEligible] = useState<EligibleReport | null>(null);

  async function load() {
    const [dashboardResponse, financialResponse, funnelResponse, fallbackResponse, queueResponse, winnersResponse, groupResponse] = await Promise.all([
      api.get<DashboardReport>("/reports/dashboard"),
      api.get<FinancialReport>("/reports/financial"),
      api.get<FunnelItem[]>("/reports/funnel"),
      api.get<FallbackReport>("/reports/fallbacks"),
      api.get<Client[]>("/reports/human-queue"),
      api.get<Client[]>("/reports/winners"),
      api.get<Group[]>("/groups")
    ]);

    setDashboard(dashboardResponse.data);
    setFinancial(financialResponse.data);
    setFunnel(funnelResponse.data);
    setFallbacks(fallbackResponse.data);
    setHumanQueue(queueResponse.data);
    setWinners(winnersResponse.data);
    setGroups(groupResponse.data);
    if (!groupId && groupResponse.data[0]) {
      setGroupId(groupResponse.data[0].id);
    }
  }

  async function loadEligible(selectedGroupId = groupId) {
    if (!selectedGroupId) {
      return;
    }
    const response = await api.get<EligibleReport>(`/reports/draw-eligible/${selectedGroupId}`);
    setEligible(response.data);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadEligible();
  }, [groupId]);

  if (!dashboard || !financial || !fallbacks) {
    return <p className="text-sm text-slate-500">Carregando relatórios...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Relatórios</h2>
          <p className="text-sm text-slate-500">Visão administrativa consolidada.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm">
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Clientes" value={dashboard.totalClients} icon={BarChart3} />
        <StatCard title="Recebido" value={formatMoney(dashboard.totalReceived)} icon={DollarSign} />
        <StatCard title="Cotas ativas" value={dashboard.activeQuotas} icon={Ticket} />
        <StatCard title="Fila humana" value={dashboard.clientsNeedingHuman} icon={MessageCircle} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div>
          <h3 className="mb-3 font-semibold">Financeiro</h3>
          <DataTable
            data={financial.byStatus}
            columns={[
              { header: "Status", render: (item) => <StatusBadge status={item.status} /> },
              { header: "Quantidade", render: (item) => item._count._all },
              { header: "Valor", render: (item) => formatMoney(item._sum.amount ?? 0) }
            ]}
          />
        </div>
        <div>
          <h3 className="mb-3 font-semibold">Funil</h3>
          <DataTable
            data={funnel}
            columns={[
              { header: "Status", render: (item) => <StatusBadge status={item.status} /> },
              { header: "Clientes", render: (item) => item._count._all }
            ]}
          />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Aptos para sorteio</h3>
          <select className="rounded-md border border-line px-3 py-2 text-sm" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        {eligible && (
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Aptos" value={eligible.totalEligible} icon={Ticket} />
            <StatCard title="Bloqueados" value={eligible.totalBlocked} icon={MessageCircle} />
            <StatCard title="Grupo" value={eligible.group.name} icon={BarChart3} />
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div>
          <h3 className="mb-3 font-semibold">Fallbacks</h3>
          <DataTable
            data={fallbacks.clients}
            columns={[
              { header: "Cliente", render: (item) => item.client.name },
              { header: "Fallbacks", render: (item) => item.fallbackCount },
              { header: "Humano", render: (item) => (item.humanRequired ? "Sim" : "Não") }
            ]}
          />
        </div>
        <div>
          <h3 className="mb-3 font-semibold">Atendimento humano</h3>
          <DataTable
            data={humanQueue}
            columns={[
              { header: "Cliente", render: (client) => client.name },
              { header: "Telefone", render: (client) => client.phone },
              { header: "Status", render: (client) => <StatusBadge status={client.status} /> }
            ]}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 font-semibold"><Crown size={18} className="text-accent" /> Contemplados</h3>
        <DataTable
          data={winners}
          columns={[
            { header: "Cliente", render: (client) => client.name },
            { header: "Telefone", render: (client) => client.phone },
            { header: "Status", render: (client) => <StatusBadge status={client.status} /> }
          ]}
        />
      </section>
    </div>
  );
}
