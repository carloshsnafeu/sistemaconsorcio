import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { RefreshCw, Send, UserPlus } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { Client, ClientStatus } from "../types";
import { formatDate, getErrorMessage } from "../utils/format";

interface ClientForm {
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  origin?: string;
  notes?: string;
}

const statuses: ClientStatus[] = [
  "NEW_LEAD",
  "QUOTA_RESERVED",
  "PARTICIPANT",
  "NEEDS_HUMAN",
  "COLD",
  "WINNER",
  "CANCELLED"
];

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const { register, handleSubmit, reset, formState } = useForm<ClientForm>();

  async function load() {
    const response = await api.get<Client[]>("/clients", { params: status ? { status } : undefined });
    setClients(response.data);
  }

  useEffect(() => {
    load();
  }, [status]);

  async function submit(data: ClientForm, landing: boolean) {
    setMessage("");
    try {
      await api.post(landing ? "/clients/from-landing" : "/clients", data);
      reset();
      await load();
      setMessage(landing ? "Lead de landing simulado." : "Cliente criado.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Clientes</h2>
          <p className="text-sm text-slate-500">Cadastro manual, landing simulada e histórico do fluxo.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm">
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <form className="grid gap-3 md:grid-cols-3" onSubmit={handleSubmit((data) => submit(data, false))}>
          <input className="rounded-md border border-line px-3 py-2" placeholder="Nome" {...register("name", { required: true })} />
          <input className="rounded-md border border-line px-3 py-2" placeholder="Telefone" {...register("phone", { required: true })} />
          <input className="rounded-md border border-line px-3 py-2" placeholder="Email" {...register("email")} />
          <input className="rounded-md border border-line px-3 py-2" placeholder="CPF" {...register("cpf")} />
          <input className="rounded-md border border-line px-3 py-2" placeholder="Origem" {...register("origin")} />
          <input className="rounded-md border border-line px-3 py-2" placeholder="Notas" {...register("notes")} />
          <div className="flex flex-wrap gap-2 md:col-span-3">
            <button
              disabled={formState.isSubmitting}
              className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white"
            >
              <UserPlus size={16} />
              Novo cliente
            </button>
            <button
              type="button"
              onClick={handleSubmit((data) => submit(data, true))}
              className="flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold"
            >
              <Send size={16} />
              Simular landing page
            </button>
          </div>
        </form>
        {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
      </section>

      <div className="flex items-center gap-3">
        <select className="rounded-md border border-line bg-white px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos os status</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        data={clients}
        columns={[
          { header: "Cliente", render: (client) => <Link className="font-semibold text-brand" to={`/clients/${client.id}`}>{client.name}</Link> },
          { header: "Telefone", render: (client) => client.phone },
          { header: "Status", render: (client) => <StatusBadge status={client.status} /> },
          { header: "Fallbacks", render: (client) => client.automation?.fallbackCount ?? 0 },
          { header: "Criado em", render: (client) => formatDate(client.createdAt) }
        ]}
      />
    </div>
  );
}
