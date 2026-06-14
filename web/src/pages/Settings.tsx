import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, UserCog } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { Role, User } from "../types";
import { getErrorMessage } from "../utils/format";

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: Role;
}

const roles: Role[] = ["ADMIN", "OPERATOR", "FINANCIAL", "VIEWER"];

export function Settings() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState("");
  const { register, handleSubmit, reset } = useForm<UserForm>({ defaultValues: { role: "OPERATOR" } });

  async function load() {
    try {
      const response = await api.get<User[]>("/users");
      setUsers(response.data);
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(data: UserForm) {
    setMessage("");
    try {
      await api.post("/users", data);
      reset({ role: "OPERATOR", name: "", email: "", password: "" });
      await load();
      setMessage("Usuário criado.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Ajustes</h2>
        <p className="text-sm text-slate-500">Sessão atual e usuários internos.</p>
      </div>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-brand">
            <UserCog size={22} />
          </div>
          <div>
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm text-slate-500">{user?.email} • {user?.role}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <form className="grid gap-3 md:grid-cols-4" onSubmit={handleSubmit(create)}>
          <input className="rounded-md border border-line px-3 py-2" placeholder="Nome" {...register("name", { required: true })} />
          <input className="rounded-md border border-line px-3 py-2" placeholder="Email" {...register("email", { required: true })} />
          <input type="password" className="rounded-md border border-line px-3 py-2" placeholder="Senha" {...register("password", { required: true })} />
          <select className="rounded-md border border-line px-3 py-2" {...register("role")}>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white md:w-fit">
            <Plus size={16} />
            Criar usuário
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
      </section>

      <DataTable
        data={users}
        columns={[
          { header: "Nome", render: (item) => item.name },
          { header: "Email", render: (item) => item.email },
          { header: "Role", render: (item) => <StatusBadge status={item.role} /> },
          { header: "Ativo", render: (item) => (item.active ? "Sim" : "Não") }
        ]}
      />
    </div>
  );
}
