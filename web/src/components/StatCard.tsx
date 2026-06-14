import { LucideIcon } from "lucide-react";

export function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <strong className="mt-2 block text-2xl font-semibold text-ink">{value}</strong>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-brand">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
