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
import "./App.css";

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
    <main>
      <header>
        <h1>Human Milk Bank Management System</h1>
        <p>
          Logged in as {currentUser.name} ({currentUser.role})
        </p>
        <button onClick={logout} type="button">
          Logout
        </button>
      </header>

      <nav>
        {visiblePages.map((item) => (
          <button
            className={activePage === item ? "active" : ""}
            key={item}
            onClick={() => setPage(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </nav>

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
    </main>
  );
}

export default App;
