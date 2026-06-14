import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Wand2 } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { Group, QuotaStatus } from "../types";
import { formatDate, formatMoney, getErrorMessage } from "../utils/format";

export function GroupDetails() {
  const { id } = useParams();
  const [group, setGroup] = useState<Group | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    if (!id) {
      return;
    }
    const response = await api.get<Group>(`/groups/${id}`);
    setGroup(response.data);
  }

  useEffect(() => {
    load();
  }, [id]);

  const quotaStats = useMemo(() => {
    const stats: Record<QuotaStatus, number> = {
      AVAILABLE: 0,
      RESERVED: 0,
      WAITING_PAYMENT: 0,
      ACTIVE: 0,
      DEFAULTED: 0,
      WINNER: 0,
      CANCELLED: 0
    };
    group?.quotas?.forEach((quota) => {
      stats[quota.status] += 1;
    });
    return stats;
  }, [group]);

  async function generateQuotas() {
    if (!id) {
      return;
    }
    try {
      const response = await api.post<{ message: string }>(`/groups/${id}/generate-quotas`);
      setMessage(response.data.message);
      await load();
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  if (!group) {
    return <p className="text-sm text-slate-500">Carregando grupo...</p>;
  }

  return (
    <div className="space-y-6">
      <Link to="/groups" className="inline-flex items-center gap-2 text-sm font-medium text-brand">
        <ArrowLeft size={16} />
        Grupos
      </Link>
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-ink">{group.name}</h2>
            <p className="text-sm text-slate-500">{group.description ?? group.prizeDescription ?? "Grupo sem descrição"}</p>
          </div>
          <StatusBadge status={group.status} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div><p className="text-xs text-slate-500">Cotas</p><p className="font-medium">{group.quotas?.length ?? 0}/{group.quotaQuantity}</p></div>
          <div><p className="text-xs text-slate-500">Valor da cota</p><p className="font-medium">{formatMoney(group.quotaValue)}</p></div>
          <div><p className="text-xs text-slate-500">Prêmio</p><p className="font-medium">{group.prizeDescription ?? "-"}</p></div>
          <div><p className="text-xs text-slate-500">Criado</p><p className="font-medium">{formatDate(group.createdAt)}</p></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={generateQuotas} className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">
            <Wand2 size={16} />
            Gerar cotas
          </button>
          <Link to={`/quotas?groupId=${group.id}`} className="rounded-md border border-line px-4 py-2 text-sm font-semibold">
            Tela de cotas
          </Link>
        </div>
        {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {Object.entries(quotaStats).map(([status, count]) => (
          <div key={status} className="rounded-lg border border-line bg-white p-4">
            <StatusBadge status={status} />
            <strong className="mt-2 block text-2xl">{count}</strong>
          </div>
        ))}
      </section>

      <section>
        <h3 className="mb-3 font-semibold">Pagamentos do grupo</h3>
        <DataTable
          data={group.payments ?? []}
          columns={[
            { header: "Cliente", render: (payment) => payment.client?.name ?? "-" },
            { header: "Cota", render: (payment) => payment.quota?.number ?? "-" },
            { header: "Valor", render: (payment) => formatMoney(payment.amount) },
            { header: "Status", render: (payment) => <StatusBadge status={payment.status} /> }
          ]}
        />
      </section>
    </div>
  );
}
