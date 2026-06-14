import { LogOut, Menu } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button className="rounded-md border border-line p-2 text-slate-600 lg:hidden" title="Menu">
          <Menu size={18} />
        </button>
        <div>
          <p className="text-sm font-semibold text-ink">Operação</p>
          <p className="text-xs text-slate-500">Controle de cotas, pagamentos e sorteios</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-ink">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.role}</p>
        </div>
        <button onClick={logout} className="rounded-md border border-line p-2 text-slate-600 hover:bg-slate-50" title="Sair">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
