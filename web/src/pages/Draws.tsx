import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Gift, Trophy } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import { Draw, Group } from "../types";
import { formatDate, getErrorMessage } from "../utils/format";

interface DrawForm {
  groupId: string;
  title: string;
  drawDate: string;
  notes?: string;
}

export function Draws() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const { register, handleSubmit, reset } = useForm<DrawForm>();

  async function load() {
    const [drawResponse, groupResponse] = await Promise.all([api.get<Draw[]>("/draws"), api.get<Group[]>("/groups")]);
    setDraws(drawResponse.data);
    setGroups(groupResponse.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(data: DrawForm) {
    setMessage("");
    try {
      await api.post("/draws", data);
      reset();
      await load();
      setMessage("Sorteio criado.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  async function registerResult(drawId: string) {
    setMessage("");
    try {
      const response = await api.post<{ message: string }>(`/draws/${drawId}/register-result`, {
        drawnNumber: Number(numbers[drawId])
      });
      await load();
      setMessage(response.data.message);
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Sorteios</h2>
        <p className="text-sm text-slate-500">Registro do sorteio presencial e contemplação.</p>
      </div>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <form className="grid gap-3 md:grid-cols-4" onSubmit={handleSubmit(create)}>
          <select className="rounded-md border border-line px-3 py-2" {...register("groupId", { required: true })}>
            <option value="">Grupo</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <input className="rounded-md border border-line px-3 py-2" placeholder="Título" {...register("title", { required: true })} />
          <input type="datetime-local" className="rounded-md border border-line px-3 py-2" {...register("drawDate", { required: true })} />
          <input className="rounded-md border border-line px-3 py-2" placeholder="Notas" {...register("notes")} />
          <button className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white md:w-fit">
            <Gift size={16} />
            Criar sorteio
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
      </section>

      <DataTable
        data={draws}
        columns={[
          { header: "Sorteio", render: (draw) => draw.title },
          { header: "Grupo", render: (draw) => draw.group?.name ?? "-" },
          { header: "Data", render: (draw) => formatDate(draw.drawDate) },
          { header: "Status", render: (draw) => <StatusBadge status={draw.status} /> },
          { header: "Vencedor", render: (draw) => draw.winningClient?.name ?? "-" },
          {
            header: "Resultado presencial",
            render: (draw) => (
              <div className="flex min-w-52 items-center gap-2">
                <input
                  type="number"
                  className="w-24 rounded-md border border-line px-2 py-1 text-sm"
                  value={numbers[draw.id] ?? ""}
                  onChange={(event) => setNumbers((current) => ({ ...current, [draw.id]: event.target.value }))}
                />
                <button onClick={() => registerResult(draw.id)} disabled={draw.status === "DONE"} className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs disabled:opacity-50">
                  <Trophy size={14} />
                  Registrar
                </button>
              </div>
            )
          }
        ]}
      />
    </div>
  );
}
