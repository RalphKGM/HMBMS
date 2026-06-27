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

const pageShortLabels = {
  "Manage Users": "MU",
  Dashboard: "DB",
  Donors: "DO",
  Beneficiaries: "BE",
  Inquiries: "IQ",
  "Milk Records": "MR",
  Pasteurization: "PA",
  Disposal: "DI",
  Dispensing: "DS",
  Reports: "RP",
  "SMS Log": "SM",
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
  const quickActions = ["Donors", "Milk Records", "Pasteurization", "Dispensing"].filter((item) =>
    visiblePages.includes(item),
  );

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
              className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-4 text-left text-sm font-semibold tracking-wide transition ${
                activePage === item
                  ? "bg-[#1d5bc4] text-white shadow-sm"
                  : "bg-transparent text-slate-800 hover:bg-white"
              }`}
              key={item}
              onClick={() => setPage(item)}
              type="button"
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded border text-[11px] ${
                  activePage === item ? "border-white/40 text-white" : "border-slate-300 text-slate-600"
                }`}
              >
                {pageShortLabels[item] || item.slice(0, 2).toUpperCase()}
              </span>
              {item}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-300 px-5 py-5">
          <div className="space-y-2">
            {quickActions.map((item) => (
              <button
                className="block w-full rounded-md px-0 py-1.5 text-left text-sm text-slate-700 hover:text-[#003b90]"
                key={item}
                onClick={() => setPage(item)}
                type="button"
              >
                {item === "Donors" ? "Register Donor" : item === "Milk Records" ? "Log Milk Intake" : item}
              </button>
            ))}
          </div>
          <button
            className="mt-5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:border-slate-400"
            onClick={logout}
            type="button"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-slate-300 bg-white/95 shadow-sm backdrop-blur">
          <div className="flex min-h-[72px] flex-wrap items-center gap-3 px-5 py-3 lg:flex-nowrap lg:px-7">
            <div className="flex min-w-[240px] flex-1 items-center gap-3 rounded-lg bg-slate-100 px-4 py-2.5 lg:max-w-[430px]">
              <span className="text-sm font-bold text-slate-500">S</span>
              <input
                aria-label="Search"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-slate-700 outline-none placeholder:text-slate-500"
                placeholder="Search donors, batches or beneficiaries"
                type="search"
              />
            </div>

            <button
              className="hidden min-h-10 rounded-lg border-0 bg-[#ff7e8d] px-5 py-2.5 text-sm font-semibold tracking-wide text-[#6e101b] hover:bg-[#ff96a2] md:inline-flex"
              type="button"
            >
              Emergency Alerts
            </button>

            <div className="ml-auto flex items-center gap-4 border-l border-slate-300 pl-5">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">{currentUser.name}</p>
                <p className="text-xs text-slate-500">{currentUser.role}</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-full border border-slate-300 bg-slate-100 text-sm font-bold text-[#003b90]">
                {currentUser.name
                  ?.split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2) || "HM"}
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-t border-slate-200 px-5 py-2 lg:hidden">
            {visiblePages.map((item) => (
              <button
                className={`shrink-0 rounded-md px-3 py-2 text-xs font-semibold ${
                  activePage === item ? "bg-[#1d5bc4] text-white" : "bg-slate-100 text-slate-700"
                }`}
                key={item}
                onClick={() => setPage(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </header>

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
