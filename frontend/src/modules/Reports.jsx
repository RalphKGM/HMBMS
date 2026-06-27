import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";
import { fullName, money } from "../utils/helpers";

const emptyReportData = {
  batches: [],
  donors: [],
  beneficiaries: [],
  transactions: [],
};

async function fetchReportsData(apiBase) {
  const response = await fetch(`${apiBase}/api/reports`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load reports.");
  }

  return {
    ...emptyReportData,
    ...body,
  };
}

function Reports() {
  const [type, setType] = useState("inventory");
  const [reportData, setReportData] = useState(emptyReportData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

  useEffect(() => {
    let isMounted = true;

    fetchReportsData(apiBase)
      .then((data) => {
        if (isMounted) setReportData(data);
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load reports.");
        setReportData(emptyReportData);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const names = useMemo(() => {
    const beneficiaryNames = reportData.beneficiaries.reduce((items, beneficiary) => {
      items[beneficiary.beneficiary_id] = fullName({
        firstName: beneficiary.first_name,
        lastName: beneficiary.last_name,
      });
      return items;
    }, {});

    const batchNames = reportData.batches.reduce((items, batch) => {
      items[batch.batch_id] = batch.batch_number;
      return items;
    }, {});

    return { beneficiaryNames, batchNames };
  }, [reportData.batches, reportData.beneficiaries]);

  const reports = {
    inventory: {
      title: "Inventory Report",
      headers: ["Batch", "Total Volume", "Available Volume", "Status", "Expiration Date"],
      rows: reportData.batches.map((batch) => [
        batch.batch_number,
        `${batch.total_volume} mL`,
        `${batch.available_volume} mL`,
        batch.status,
        batch.expiration_date || "Not set",
      ]),
    },
    dispensing: {
      title: "Dispensing Report",
      headers: ["Recipient", "Batch", "Volume", "Price", "Date"],
      rows: reportData.transactions.map((transaction) => [
        names.beneficiaryNames[transaction.beneficiary_id] || "Unknown",
        names.batchNames[transaction.batch_id] || `Batch #${transaction.batch_id}`,
        `${transaction.volume_dispensed} mL`,
        money(transaction.price),
        transaction.transaction_date,
      ]),
    },
    donors: {
      title: "Donor Report",
      headers: ["DTN", "Name", "Program", "Status"],
      rows: reportData.donors.map((donor) => [
        donor.dtn,
        fullName({
          firstName: donor.first_name,
          middleName: donor.middle_name,
          lastName: donor.last_name,
        }),
        donor.collection_program,
        donor.status,
      ]),
    },
  };

  const report = reports[type];

  if (loading) {
    return <p>Loading reports...</p>;
  }

  return (
    <section>
      <h2>Reports</h2>
      {error && <p className="message">{error}</p>}
      <label>
        Report Type
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="inventory">Inventory Report</option>
          <option value="dispensing">Dispensing Report</option>
          <option value="donors">Donor Report</option>
        </select>
      </label>
      <button onClick={() => window.print()} type="button">
        Print
      </button>
      <h3>{report.title}</h3>
      <Table headers={report.headers} rows={report.rows} />
    </section>
  );
}

export default Reports;
