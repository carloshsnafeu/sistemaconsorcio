import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { Payment } from "../types";
import { formatDate, formatMoney, getErrorMessage } from "../utils/format";

export function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await api.get<Payment[]>("/payments");
    setPayments(response.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAsPaid(id: string) {
    setMessage("");
    try {
      await api.post(`/payments/${id}/mark-as-paid`);
      await load();
      setMessage("Pagamento confirmado e cota ativada.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Pagamentos</h2>
          <p className="text-sm text-slate-500">Pagamentos mock e confirmação manual.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm">
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>
      {message && <p className="rounded-md bg-white px-3 py-2 text-sm text-slate-600">{message}</p>}
      <DataTable
        data={payments}
        columns={[
          { header: "Cliente", render: (payment) => payment.client?.name ?? "-" },
          { header: "Grupo", render: (payment) => payment.group?.name ?? "-" },
          { header: "Cota", render: (payment) => payment.quota?.number ?? "-" },
          { header: "Valor", render: (payment) => formatMoney(payment.amount) },
          { header: "Vencimento", render: (payment) => formatDate(payment.dueDate) },
          { header: "Status", render: (payment) => <StatusBadge status={payment.status} /> },
          {
            header: "Ações",
            render: (payment) => (
              <button
                onClick={() => markAsPaid(payment.id)}
                disabled={payment.status === "PAID"}
                className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                Marcar pago
              </button>
            )
          }
        ]}
      />
    </div>
  );
}
