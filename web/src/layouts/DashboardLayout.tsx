import { Outlet } from "react-router-dom";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
