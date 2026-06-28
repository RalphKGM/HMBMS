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
  const displayName = currentUser.name || currentUser.username || "HMB Staff";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "HM";

  if (!currentUser) {
    return <Login />;
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-slate-300 bg-slate-100 lg:flex">
        <div className="px-7 pb-5 pt-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-normal text-[#003b90]">
            HMB
            <span className="block">{currentUser.role}</span>
          </h1>
          <p className="mt-1 text-sm font-semibold tracking-wide text-slate-500">Clinical Unit A</p>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
          {visiblePages.map((item) => (
            <button
              className={`flex min-h-12 w-full items-center rounded-lg px-5 text-left text-sm font-semibold tracking-wide transition ${
                activePage === item
                  ? "bg-[#1d5bc4] text-white shadow-sm"
                  : "bg-transparent text-slate-800 hover:bg-white"
              }`}
              key={item}
              onClick={() => setPage(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-300 px-5 py-5">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1d5bc4] text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{displayName}</p>
                <p className="truncate text-xs font-semibold text-slate-500">
                  {currentUser.role}
                  {currentUser.username ? ` - ${currentUser.username}` : ""}
                </p>
              </div>
            </div>
          </div>
          <button
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:border-slate-400"
            onClick={logout}
            type="button"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">


        <div className="px-5 py-6 lg:px-7">
          <div className="mx-auto w-full max-w-[1120px]">
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
      </div>
    </main>
  );
}

export default App;
