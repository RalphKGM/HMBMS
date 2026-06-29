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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { currentUser, logout } = useAuth();

  const visiblePages = getVisiblePages(currentUser?.role);
  const activePage = visiblePages.includes(page) ? page : "Dashboard";
  const canManageUsers = currentUser?.role === "Admin";

  if (!currentUser) {
    return <Login />;
  }

  const displayName = currentUser.name || currentUser.username || "HMB Staff";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "HM";

  const goToPage = (nextPage) => {
    setPage(nextPage);
    setIsMobileNavOpen(false);
  };

  const handleLogout = () => {
    setIsMobileNavOpen(false);
    logout();
  };

  const renderNavigation = ({ showBrand = true } = {}) => (
    <>
      {showBrand && (
        <div className="px-7 pb-5 pt-6">
          <h1 className="milklink-brand text-4xl font-semibold leading-tight tracking-normal text-[#003b90]">
            MilkLink
          </h1>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {visiblePages.map((item) => (
          <button
            className={`flex min-h-12 w-full items-center rounded-lg px-5 text-left text-sm font-semibold tracking-wide transition ${
              activePage === item
                ? "bg-[#1d5bc4] text-white shadow-sm"
                : "bg-transparent text-slate-800 hover:bg-white"
            }`}
            key={item}
            onClick={() => goToPage(item)}
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
          onClick={handleLogout}
          type="button"
        >
          Log out
        </button>
      </div>
    </>
  );

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-slate-300 bg-slate-100 lg:flex">
        {renderNavigation()}
      </aside>

      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <button
          type="button"
          className="mobile-nav-button"
          onClick={() => setIsMobileNavOpen(true)}
          aria-label="Open navigation"
          aria-expanded={isMobileNavOpen}
        >
          <span />
          <span />
          <span />
        </button>
        <span className="milklink-brand text-2xl font-bold text-[#003b90]">MilkLink</span>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#1d5bc4] text-xs font-bold text-white">
          {initials}
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 bg-slate-950/45 transition-opacity lg:hidden ${
          isMobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsMobileNavOpen(false)}
      />

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[min(82vw,20rem)] flex-col border-r border-slate-300 bg-slate-100 shadow-2xl transition-transform duration-200 lg:hidden ${
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3 px-7 pb-5 pt-6">
          <h1 className="milklink-brand min-w-0 text-4xl font-semibold leading-tight tracking-normal text-[#003b90]">
            MilkLink
          </h1>
          <button
            type="button"
            className="h-10 w-10 shrink-0 rounded-full border-slate-200 bg-white p-0 text-lg text-slate-600"
            onClick={() => setIsMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            X
          </button>
        </div>
        {renderNavigation({ showBrand: false })}
      </aside>

      <div className="lg:pl-72">
        <div className="px-4 py-5 sm:px-5 lg:px-7">
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
