import { useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import { seedData } from "./data/seedData";
import { loadAppData, saveAppData } from "./lib/dataStore";
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
  const [data, setData] = useState(seedData);
  const [page, setPage] = useState("Dashboard");
  const [message, setMessage] = useState("");
  const { currentUser, logout, isAdmin } = useAuth();

  const visiblePages = isAdmin ? pages : pages.filter((item) => item !== "Manage Users");
  const activePage = visiblePages.includes(page) ? page : "Dashboard";

  useEffect(() => {
    const loadData = async () => {
      const result = await loadAppData(seedData);
      setData(result.data);
    }

    loadData();
  }, []);

  const updateData = async (nextData, notice) => {
    setData(nextData);
    setMessage(notice || "");
    await saveAppData(nextData);
  }

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

      {message && <p className="message">{message}</p>}

      {activePage === "Manage Users" && isAdmin && <ManageUsers />}
      {activePage === "Dashboard" && <Dashboard data={data} />}
      {activePage === "Donors" && <Donors currentUser={currentUser} />}
      {activePage === "Beneficiaries" && <Beneficiaries currentUser={currentUser} />}
      {activePage === "Milk Records" && <MilkRecords />}
      {activePage === "Pasteurization" && <Pasteurization />}
      {activePage === "Dispensing" && (
        <Dispensing
          currentUser={currentUser}
          data={data}
          updateData={updateData}
        />
      )}
      {activePage === "Reports" && <Reports data={data} />}
      {activePage === "SMS Log" && (
        <SmsLog currentUser={currentUser} data={data} updateData={updateData} />
      )}
    </main>
  );
}

export default App;
