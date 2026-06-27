import { useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import { seedData } from "./data/seedData";
import { loadAppData, saveAppData } from "./lib/dataStore";
import { useAuth } from "./context/AuthContext";
import Beneficiaries from "./modules/Beneficiaries";
import Dispensing from "./modules/Dispensing";
import DisposalRecords from "./modules/DisposalRecords";
import Donors from "./modules/Donors";
import ManageUsers from "./modules/ManageUsers";
import MilkRecords from "./modules/MilkRecords";
import Inquiries from "./modules/Inquiries";
import Pasteurization from "./modules/Pasteurization";
import Reports from "./modules/Reports";
import SmsLog from "./modules/SmsLog";
import { nextId, today } from "./utils/helpers";
import "./App.css";

const pages = [
  "Manage Users",
  "Dashboard",
  "Donors",
  "Beneficiaries",
  "Milk Records",
  "Inquiries",
  "Pasteurization",
  "Dispensing",
  "Disposal Records",
  "Reports",
  "SMS Log",
];

function App() {
  const [data, setData] = useState(seedData);
  const [page, setPage] = useState("Dashboard");
  const [message, setMessage] = useState("");
  const { currentUser, logout, isAdmin } = useAuth();

  const visiblePages = isAdmin ? pages : pages.filter((item) => item !== "Manage Users");

  useEffect(() => {
    const loadData = async () => {
      const result = await loadAppData(seedData);
      setData(result.data);
    }

    loadData();
  }, []);

  useEffect(() => {
    if (currentUser && !visiblePages.includes(page)) {
      setPage("Dashboard");
    }
  }, [currentUser, page, visiblePages]);

  const updateData = async (nextData, notice) => {
    const previousData = data;
    let mergedData = nextData;

    const newlyAvailableBatches = (nextData.batches || []).filter((batch) => {
      const previousBatch = (previousData.batches || []).find((item) => item.id === batch.id);
      return batch.status === "Available" && previousBatch?.status !== "Available";
    });

    if (newlyAvailableBatches.length) {
      const pendingInquiries = (nextData.inquiries || []).filter((inquiry) => inquiry.status === "Pending");

      if (pendingInquiries.length) {
        const smsLogs = [...(nextData.smsLogs || [])];
        const sentDate = new Date().toISOString();
        let nextSmsId = nextId(smsLogs);

        const inquiries = (nextData.inquiries || []).map((inquiry) => {
          if (inquiry.status !== "Pending") return inquiry;

          const beneficiary = (nextData.beneficiaries || []).find((item) => item.id === inquiry.beneficiaryId);

          smsLogs.push({
            id: nextSmsId,
            beneficiaryId: inquiry.beneficiaryId,
            inquiryId: inquiry.id,
            message:
              "Good day! Human milk is now available for dispensing. Please contact the milk bank if you still require donor milk.",
            sentDate,
            deliveryStatus: "Sent",
            status: "Sent",
            sentBy: null,
          });

          nextSmsId += 1;

          return {
            ...inquiry,
            status: "Notified",
            smsDate: today(),
            fulfilledDate: today(),
            beneficiaryName: beneficiary ? `${beneficiary.firstName} ${beneficiary.lastName}` : inquiry.beneficiaryName,
          };
        });

        mergedData = {
          ...nextData,
          inquiries,
          smsLogs,
        };
      }
    }

    setData(mergedData);
    setMessage(notice || "");
    await saveAppData(mergedData);
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
            className={page === item ? "active" : ""}
            key={item}
            onClick={() => setPage(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </nav>

      {message && <p className="message">{message}</p>}

      {page === "Manage Users" && isAdmin && <ManageUsers />}
      {page === "Dashboard" && <Dashboard data={data} />}
      {page === "Donors" && <Donors currentUser={currentUser} />}
      {page === "Beneficiaries" && (
        <Beneficiaries data={data} updateData={updateData} />
      )}
      {page === "Milk Records" && <MilkRecords data={data} updateData={updateData} />}
      {page === "Inquiries" && <Inquiries data={data} updateData={updateData} />}
      {page === "Pasteurization" && (
        <Pasteurization currentUser={currentUser} data={data} updateData={updateData} />
      )}
      {page === "Dispensing" && (
        <Dispensing
          currentUser={currentUser}
          data={data}
          updateData={updateData}
        />
      )}
      {page === "Disposal Records" && (
        <DisposalRecords currentUser={currentUser} data={data} updateData={updateData} />
      )}
      {page === "Reports" && <Reports data={data} />}
      {page === "SMS Log" && (
        <SmsLog data={data} updateData={updateData} />
      )}
    </main>
  );
}

export default App;
