import {
  BarChart3,
  Bot,
  CreditCard,
  Gauge,
  Gift,
  Layers3,
  MessageCircle,
  Settings,
  Ticket,
  Users
} from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/groups", label: "Grupos", icon: Layers3 },
  { to: "/quotas", label: "Cotas", icon: Ticket },
  { to: "/payments", label: "Pagamentos", icon: CreditCard },
  { to: "/draws", label: "Sorteios", icon: Gift },
  { to: "/reports", label: "Relatórios", icon: BarChart3 },
  { to: "/automation", label: "Automação", icon: Bot },
  { to: "/human-queue", label: "Fila Humana", icon: MessageCircle },
  { to: "/settings", label: "Ajustes", icon: Settings }
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white px-4 py-5 lg:block">
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase text-brand">Sorteou Ganhou</p>
        <h1 className="text-xl font-semibold text-ink">Admin</h1>
      </div>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-teal-50 text-brand" : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                }`
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
