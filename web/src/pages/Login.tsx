import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../utils/format";

interface LoginForm {
  email: string;
  password: string;
}

export function Login() {
  const { login, token } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState } = useForm<LoginForm>({
    defaultValues: { email: "admin@sorteouganhou.com", password: "admin123" }
  });

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(data: LoginForm) {
    setError("");
    try {
      await login(data.email, data.password);
      navigate("/dashboard");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-8 shadow-soft">
        <div className="mb-7">
          <p className="text-sm font-semibold uppercase text-brand">Sorteou Ganhou</p>
          <h1 className="text-2xl font-semibold text-ink">Admin</h1>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input className="mt-1 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-brand" {...register("email")} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Senha
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-brand"
              {...register("password")}
            />
          </label>
          {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <button
            disabled={formState.isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            <LogIn size={18} />
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
