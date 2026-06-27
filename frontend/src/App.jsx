import { useState } from "react";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import { useAuth } from "./hooks/useAuth";
import Beneficiaries from "./modules/Beneficiaries";
import Dispensing from "./modules/Dispensing";
import Donors from "./modules/Donors";
import Disposal from "./modules/Disposal";
import Inquiries from "./modules/Inquiries";
import ManageUsers from "./modules/ManageUsers";
import MilkRecords from "./modules/MilkRecords";
import Pasteurization from "./modules/Pasteurization";
import Reports from "./modules/Reports";
import SmsLog from "./modules/SmsLog";

const rolePages = {
  Admin: [
    "Manage Users",
    "Dashboard",
    "Donors",
    "Beneficiaries",
    "Inquiries",
    "Milk Records",
    "Pasteurization",
    "Disposal",
    "Dispensing",
    "Reports",
    "SMS Log",
  ],
  Doctor: ["Dashboard", "Beneficiaries", "Inquiries", "Dispensing", "Reports", "SMS Log"],
  Nurse: [
    "Dashboard",
    "Donors",
    "Beneficiaries",
    "Inquiries",
    "Milk Records",
    "Pasteurization",
    "Disposal",
    "Dispensing",
    "Reports",
    "SMS Log",
  ],
  Midwife: [
    "Dashboard",
    "Donors",
    "Beneficiaries",
    "Inquiries",
    "Milk Records",
    "Dispensing",
    "Reports",
    "SMS Log",
  ],
};

function getVisiblePages(role) {
  return rolePages[role] || rolePages.Midwife;
}

function App() {
  const [page, setPage] = useState("Dashboard");
  const { currentUser, logout } = useAuth();

  const visiblePages = getVisiblePages(currentUser?.role);
  const activePage = visiblePages.includes(page) ? page : "Dashboard";
  const canManageUsers = currentUser?.role === "Admin";

  if (!currentUser) {
    return <Login />;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="hidden" />

      <nav className="fixed left-0 top-0 flex h-screen w-64 flex-col gap-2 border-r border-slate-200 bg-slate-100 p-4">
        {visiblePages.map((item) => (
          <button
            className={`rounded-xl px-4 py-3 text-left transition ${
              activePage === item
                ? "bg-slate-700 font-semibold text-white shadow-md"
                : "text-slate-700 hover:bg-slate-200 hover:text-slate-900"
            }`}
            key={item}
            onClick={() => setPage(item)}
            type="button"
          >
            {item}
          </button>
        ))}
        <div className="mt-auto border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-800">{currentUser.name}</p>
          <p className="text-xs text-slate-500">{currentUser.role}</p>
          <button
            className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-slate-700"
            onClick={logout}
            type="button"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="ml-64 min-h-screen p-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {activePage === "Manage Users" && canManageUsers && <ManageUsers />}
        {activePage === "Dashboard" && <Dashboard />}
        {activePage === "Donors" && <Donors currentUser={currentUser} />}
        {activePage === "Beneficiaries" && <Beneficiaries currentUser={currentUser} />}
        {activePage === "Inquiries" && <Inquiries />}
        {activePage === "Milk Records" && <MilkRecords currentUser={currentUser} />}
        {activePage === "Pasteurization" && <Pasteurization currentUser={currentUser} />}
        {activePage === "Disposal" && <Disposal />}
        {activePage === "Dispensing" && <Dispensing currentUser={currentUser} />}
        {activePage === "Reports" && <Reports />}
        {activePage === "SMS Log" && <SmsLog currentUser={currentUser} />}
        </div>
      </div>
    </main>
  );
}

export default App;
