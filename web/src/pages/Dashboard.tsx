import { useEffect, useState } from "react";
import { AlertCircle, Crown, DollarSign, Hourglass, Percent, Ticket, UserCheck, Users } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { api } from "../services/api";
import { formatMoney } from "../utils/format";

interface DashboardReport {
  totalClients: number;
  activeQuotas: number;
  availableQuotas: number;
  totalReceived: string | number;
  totalPending: string | number;
  totalWinners: number;
  clientsNeedingHuman: number;
  conversionLeadToParticipant: number;
}

export function Dashboard() {
  const [report, setReport] = useState<DashboardReport | null>(null);

  useEffect(() => {
    api.get<DashboardReport>("/reports/dashboard").then((response) => setReport(response.data));
  }, []);

  if (!report) {
    return <p className="text-sm text-slate-500">Carregando dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Dashboard</h2>
        <p className="text-sm text-slate-500">Indicadores operacionais atualizados pelo banco.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Clientes" value={report.totalClients} icon={Users} />
        <StatCard title="Cotas ativas" value={report.activeQuotas} icon={UserCheck} />
        <StatCard title="Cotas disponíveis" value={report.availableQuotas} icon={Ticket} />
        <StatCard title="Recebido" value={formatMoney(report.totalReceived)} icon={DollarSign} />
        <StatCard title="Pendente" value={formatMoney(report.totalPending)} icon={Hourglass} />
        <StatCard title="Precisam de atendimento" value={report.clientsNeedingHuman} icon={AlertCircle} />
        <StatCard title="Contemplados" value={report.totalWinners} icon={Crown} />
        <StatCard title="Conversão" value={`${report.conversionLeadToParticipant}%`} icon={Percent} />
      </div>
    </div>
  );
}
