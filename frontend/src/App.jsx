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
    "Manage Users",
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

const navIcons = {
  Dashboard: (
    <>
      <rect x="3" y="3" width="6" height="6" />
      <rect x="15" y="3" width="6" height="6" />
      <rect x="3" y="15" width="6" height="6" />
      <rect x="15" y="15" width="6" height="6" />
    </>
  ),
  Donors: (
    <>
      <path d="M16 11a4 4 0 1 0-8 0" />
      <path d="M3 18c1.4-2.4 4-4 7-4s5.6 1.6 7 4" />
      <path d="M18 8.5a3 3 0 0 1 0 5" />
      <path d="M21 18c-.6-1.2-1.5-2.1-2.7-2.8" />
      <path d="M6 8.5a3 3 0 0 0 0 5" />
      <path d="M3 18c.6-1.2 1.5-2.1 2.7-2.8" />
    </>
  ),
  Beneficiaries: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
      <path d="M9 14c.8 1 1.8 1.5 3 1.5S14.2 15 15 14" />
    </>
  ),
  Inquiries: (
    <>
      <path d="M5 5h14v12H8l-3 3V5Z" />
      <path d="M9 9h6" />
      <path d="M9 13h4" />
    </>
  ),
  "Milk Records": (
    <>
      <path d="M7 4h10" />
      <path d="M8 7h8v13H8V7Z" />
      <path d="M12 10v7" />
      <path d="M9.5 13.5h5" />
    </>
  ),
  Pasteurization: (
    <>
      <path d="M10 3h4" />
      <path d="M11 3v6l-5 9a2 2 0 0 0 1.7 3h8.6a2 2 0 0 0 1.7-3l-5-9V3" />
      <path d="M8.5 15h7" />
    </>
  ),
  Disposal: (
    <>
      <path d="M6 7h12" />
      <path d="M9 7V5h6v2" />
      <path d="M8 10l1 10h6l1-10" />
      <path d="M10.5 13v4" />
      <path d="M13.5 13v4" />
    </>
  ),
  Dispensing: (
    <>
      <path d="M7 8h7v13H7V8Z" />
      <path d="M9 8V5h3v3" />
      <path d="M17 3v18" />
      <path d="M14 6h6" />
      <path d="M14 14h6" />
      <path d="M9.5 12h2" />
      <path d="M10.5 11v2" />
    </>
  ),
  Reports: (
    <>
      <path d="M5 20V9" />
      <path d="M11 20V4" />
      <path d="M17 20v-7" />
      <path d="M3 20h18" />
    </>
  ),
  "SMS Log": (
    <>
      <path d="M4 5h16v12H8l-4 4V5Z" />
      <path d="M8 11h.01" />
      <path d="M12 11h.01" />
      <path d="M16 11h.01" />
    </>
  ),
  "Manage Users": (
    <>
      <path d="M15 8a4 4 0 1 0-8 0" />
      <path d="M4 20c1.2-3 3.6-5 7-5 1.2 0 2.3.3 3.2.8" />
      <path d="M18 12v6" />
      <path d="M15 15h6" />
    </>
  ),
};

function NavIcon({ page }) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {navIcons[page] || navIcons.Dashboard}
    </svg>
  );
}

function App() {
  const [page, setPage] = useState("Dashboard");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
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

  const notifyDataChange = () => {
    setDataVersion((current) => current + 1);
  };

  const renderPageContent = (pageName) => {
    switch (pageName) {
      case "Manage Users":
        return canManageUsers ? <ManageUsers /> : null;
      case "Dashboard":
        return <Dashboard refreshKey={dataVersion} />;
      case "Donors":
        return <Donors currentUser={currentUser} />;
      case "Beneficiaries":
        return <Beneficiaries currentUser={currentUser} />;
      case "Inquiries":
        return <Inquiries />;
      case "Milk Records":
        return <MilkRecords currentUser={currentUser} onDataChange={notifyDataChange} />;
      case "Pasteurization":
        return <Pasteurization currentUser={currentUser} onDataChange={notifyDataChange} refreshKey={dataVersion} />;
      case "Disposal":
        return <Disposal />;
      case "Dispensing":
        return <Dispensing currentUser={currentUser} />;
      case "Reports":
        return <Reports refreshKey={dataVersion} />;
      case "SMS Log":
        return <SmsLog currentUser={currentUser} />;
      default:
        return null;
    }
  };

  const renderNavigation = ({ showBrand = true } = {}) => (
    <>
      {showBrand && (
        <div className="px-6 pb-1 pt-5">
          <h1 className="milklink-brand text-[2.1rem] font-bold leading-tight tracking-normal text-[#003b90]">
            MilkLink
          </h1>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-3.5 py-3.5">
        {visiblePages.map((item) => (
          <button
            aria-current={activePage === item ? "page" : undefined}
            className={`flex min-h-[2.625rem] w-full items-center justify-start gap-3.5 rounded-lg border-0 px-3.5 py-2.5 text-left text-sm font-bold tracking-[0.04em] shadow-none transition-all duration-150 active:scale-[0.98] ${
              activePage === item
                ? "bg-[#1d5bc4] text-white"
                : "bg-transparent text-slate-700 hover:bg-[#dbe8ff] hover:text-[#003b90]"
            }`}
            key={item}
            onClick={() => goToPage(item)}
            type="button"
          >
            <NavIcon page={item} />
            <span className="flex-1 text-left">{item}</span>
          </button>
        ))}
      </nav>

      <div className="border-t border-slate-300 px-4 py-3.5">
        <div className="mb-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1d5bc4] text-xs font-bold text-white">
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
          className="flex min-h-[2.625rem] w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-bold text-slate-700 shadow-sm transition-all duration-150 hover:border-[#1d5bc4] hover:bg-[#dbe8ff] hover:text-[#003b90] active:scale-[0.98]"
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
          className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white p-0 shadow-sm transition-colors hover:border-[#1d5bc4] hover:bg-[#dbe8ff]"
          onClick={() => setIsMobileNavOpen(true)}
          aria-label="Open navigation"
          aria-expanded={isMobileNavOpen}
        >
          <span className="block h-0.5 w-5 rounded-full bg-[#1d5bc4]" />
          <span className="block h-0.5 w-5 rounded-full bg-[#1d5bc4]" />
          <span className="block h-0.5 w-5 rounded-full bg-[#1d5bc4]" />
        </button>
        <span className="milklink-brand text-2xl font-extrabold text-[#003b90]">MilkLink</span>
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
        <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
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
            {visiblePages.map((item) => (
              <div
                key={item}
                className={activePage === item ? "block" : "hidden"}
                aria-hidden={activePage === item ? undefined : true}
              >
                {renderPageContent(item)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
