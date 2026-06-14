import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { Automation } from "../pages/Automation";
import { ClientDetails } from "../pages/ClientDetails";
import { Clients } from "../pages/Clients";
import { Dashboard } from "../pages/Dashboard";
import { Draws } from "../pages/Draws";
import { GroupDetails } from "../pages/GroupDetails";
import { Groups } from "../pages/Groups";
import { HumanQueue } from "../pages/HumanQueue";
import { Login } from "../pages/Login";
import { Payments } from "../pages/Payments";
import { Quotas } from "../pages/Quotas";
import { Reports } from "../pages/Reports";
import { Settings } from "../pages/Settings";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetails />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:id" element={<GroupDetails />} />
          <Route path="/quotas" element={<Quotas />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/draws" element={<Draws />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/automation" element={<Automation />} />
          <Route path="/human-queue" element={<HumanQueue />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
