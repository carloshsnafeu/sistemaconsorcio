import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { Layers3, Plus, Wand2 } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { Group } from "../types";
import { formatMoney, getErrorMessage } from "../utils/format";

interface GroupForm {
  name: string;
  description?: string;
  quotaValue: number;
  quotaQuantity: number;
  prizeValue?: number;
  prizeDescription?: string;
}

export function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [message, setMessage] = useState("");
  const { register, handleSubmit, reset, formState } = useForm<GroupForm>({
    defaultValues: { quotaQuantity: 180, quotaValue: 500 }
  });

  async function load() {
    const response = await api.get<Group[]>("/groups");
    setGroups(response.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(data: GroupForm) {
    setMessage("");
    try {
      await api.post("/groups", data);
      reset({ quotaQuantity: 180, quotaValue: 500 });
      await load();
      setMessage("Grupo criado.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  async function generateQuotas(groupId: string) {
    setMessage("");
    try {
      const response = await api.post<{ message: string }>(`/groups/${groupId}/generate-quotas`);
      await load();
      setMessage(response.data.message);
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Grupos</h2>
        <p className="text-sm text-slate-500">Controle dos grupos, valores e geração de cotas.</p>
      </div>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <form className="grid gap-3 md:grid-cols-3" onSubmit={handleSubmit(create)}>
          <input className="rounded-md border border-line px-3 py-2" placeholder="Nome do grupo" {...register("name", { required: true })} />
          <input className="rounded-md border border-line px-3 py-2" placeholder="Descrição" {...register("description")} />
          <input className="rounded-md border border-line px-3 py-2" placeholder="Prêmio" {...register("prizeDescription")} />
          <input type="number" className="rounded-md border border-line px-3 py-2" placeholder="Qtd. cotas" {...register("quotaQuantity", { valueAsNumber: true })} />
          <input type="number" className="rounded-md border border-line px-3 py-2" placeholder="Valor da cota" {...register("quotaValue", { valueAsNumber: true })} />
          <input type="number" className="rounded-md border border-line px-3 py-2" placeholder="Valor do prêmio" {...register("prizeValue", { valueAsNumber: true })} />
          <button disabled={formState.isSubmitting} className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white md:col-span-3 md:w-fit">
            <Plus size={16} />
            Criar grupo
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
      </section>

      <DataTable
        data={groups}
        columns={[
          { header: "Grupo", render: (group) => <Link className="font-semibold text-brand" to={`/groups/${group.id}`}>{group.name}</Link> },
          { header: "Status", render: (group) => <StatusBadge status={group.status} /> },
          { header: "Cotas", render: (group) => `${group._count?.quotas ?? 0}/${group.quotaQuantity}` },
          { header: "Valor", render: (group) => formatMoney(group.quotaValue) },
          {
            header: "Ações",
            render: (group) => (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => generateQuotas(group.id)} className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs">
                  <Wand2 size={14} />
                  Gerar cotas
                </button>
                <Link to={`/quotas?groupId=${group.id}`} className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs">
                  <Layers3 size={14} />
                  Ver cotas
                </Link>
              </div>
            )
          }
        ]}
      />
    </div>
  );
}
