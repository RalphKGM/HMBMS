import { useState } from "react";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import { useAuth } from "./hooks/useAuth";
import Beneficiaries from "./modules/Beneficiaries";
import Dispensing from "./modules/Dispensing";
import Donors from "./modules/Donors";
import ManageUsers from "./modules/ManageUsers";
import MilkRecords from "./modules/MilkRecords";
import Pasteurization from "./modules/Pasteurization";
import Reports from "./modules/Reports";
import SmsLog from "./modules/SmsLog";
import "./App.css";

const pages = [
  "Manage Users",
  "Dashboard",
  "Donors",
  "Beneficiaries",
  "Milk Records",
  "Pasteurization",
  "Dispensing",
  "Reports",
  "SMS Log",
];

function App() {
  const [page, setPage] = useState("Dashboard");
  const { currentUser, logout, isAdmin } = useAuth();

  const visiblePages = isAdmin ? pages : pages.filter((item) => item !== "Manage Users");
  const activePage = visiblePages.includes(page) ? page : "Dashboard";

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

      {activePage === "Manage Users" && isAdmin && <ManageUsers />}
      {activePage === "Dashboard" && <Dashboard />}
      {activePage === "Donors" && <Donors currentUser={currentUser} />}
      {activePage === "Beneficiaries" && <Beneficiaries currentUser={currentUser} />}
      {activePage === "Milk Records" && <MilkRecords currentUser={currentUser} />}
      {activePage === "Pasteurization" && <Pasteurization currentUser={currentUser} />}
      {activePage === "Dispensing" && <Dispensing currentUser={currentUser} />}
      {activePage === "Reports" && <Reports />}
      {activePage === "SMS Log" && <SmsLog currentUser={currentUser} />}
    </main>
  );
}

export default App;
