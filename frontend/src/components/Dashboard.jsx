import { useEffect, useState } from "react";
import Table from "./Table";

const emptySummary = {
  availableMilk: 0,
  donorCount: 0,
  beneficiaryCount: 0,
  pendingInquiryCount: 0,
  availableBatches: [],
};

async function fetchDashboardSummary(apiBase) {
  const response = await fetch(`${apiBase}/api/dashboard`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load dashboard.");
  }

  return {
    ...emptySummary,
    ...body,
  };
}

function Dashboard() {
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

  useEffect(() => {
    let isMounted = true;

    fetchDashboardSummary(apiBase)
      .then((nextSummary) => {
        if (isMounted) setSummary(nextSummary);
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load dashboard.");
        setSummary(emptySummary);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  return (
    <section>
      <h2>Dashboard</h2>
      {error && <p className="message">{error}</p>}
      <p>Available milk: {summary.availableMilk} mL</p>
      <p>Total donors: {summary.donorCount}</p>
      <p>Total beneficiaries: {summary.beneficiaryCount}</p>
      <p>Pending inquiries: {summary.pendingInquiryCount}</p>

      <h3>Available Batches</h3>
      <Table
        headers={["Batch Number", "Available Volume", "Status", "Expiration Date"]}
        rows={summary.availableBatches.map((batch) => [
          batch.batch_number,
          `${batch.available_volume} mL`,
          batch.status,
          batch.expiration_date || "Not set",
        ])}
      />
    </section>
  );
}

export default Dashboard;
