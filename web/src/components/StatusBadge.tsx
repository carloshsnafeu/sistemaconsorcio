const classes: Record<string, string> = {
  NEW_LEAD: "bg-sky-100 text-sky-800",
  FIRST_CONTACT_SENT: "bg-cyan-100 text-cyan-800",
  EXPLANATION_SENT: "bg-cyan-100 text-cyan-800",
  WAITING_INTEREST_CONFIRMATION: "bg-amber-100 text-amber-800",
  COLLECTING_DATA: "bg-amber-100 text-amber-800",
  WAITING_CPF: "bg-amber-100 text-amber-800",
  WAITING_QUOTA_CHOICE: "bg-amber-100 text-amber-800",
  QUOTA_RESERVED: "bg-orange-100 text-orange-800",
  PAYMENT_LINK_SENT: "bg-orange-100 text-orange-800",
  WAITING_PAYMENT: "bg-orange-100 text-orange-800",
  PARTICIPANT: "bg-emerald-100 text-emerald-800",
  NEEDS_HUMAN: "bg-rose-100 text-rose-800",
  COLD: "bg-slate-200 text-slate-700",
  WITHDRAWN: "bg-slate-200 text-slate-700",
  DEFAULTED: "bg-red-100 text-red-800",
  WINNER: "bg-yellow-100 text-yellow-800",
  CANCELLED: "bg-slate-200 text-slate-700",
  OPEN: "bg-emerald-100 text-emerald-800",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  PAUSED: "bg-amber-100 text-amber-800",
  FINISHED: "bg-slate-200 text-slate-700",
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  RESERVED: "bg-orange-100 text-orange-800",
  ACTIVE: "bg-teal-100 text-teal-800",
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  OVERDUE: "bg-red-100 text-red-800",
  REFUNDED: "bg-slate-200 text-slate-700",
  EXEMPT: "bg-indigo-100 text-indigo-800",
  SCHEDULED: "bg-sky-100 text-sky-800",
  DONE: "bg-emerald-100 text-emerald-800"
};

export function StatusBadge({ status }: { status?: string }) {
  if (!status) {
    return null;
  }

  return (
    <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${classes[status] ?? "bg-slate-200 text-slate-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
