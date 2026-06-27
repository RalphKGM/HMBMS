import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";
import { fullName, money } from "../utils/helpers";

const emptyReportData = {
  batches: [],
  donors: [],
  beneficiaries: [],
  collections: [],
  pasteurizationRecords: [],
  transactions: [],
};

function startOfPeriod(range) {
  const now = new Date();
  if (range === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  if (range === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (range === "year") {
    return new Date(now.getFullYear(), 0, 1);
  }
  return null;
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWithinRange(value, range) {
  const date = parseDate(value);
  const start = startOfPeriod(range);
  if (!date || !start) return true;
  return date >= start;
}

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
  const [reportType, setReportType] = useState("collection");
  const [period, setPeriod] = useState("week");
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

    const donorNames = reportData.donors.reduce((items, donor) => {
      items[donor.donor_id] = fullName({
        firstName: donor.first_name,
        middleName: donor.middle_name,
        lastName: donor.last_name,
      });
      return items;
    }, {});

    const batchNames = reportData.batches.reduce((items, batch) => {
      items[batch.batch_id] = batch.batch_number;
      return items;
    }, {});

    return { beneficiaryNames, donorNames, batchNames };
  }, [reportData.batches, reportData.beneficiaries, reportData.donors]);

  const filteredCollections = useMemo(
    () =>
      reportData.collections.filter((collection) => isWithinRange(collection.collection_date, period)),
    [period, reportData.collections],
  );

  const filteredPasteurization = useMemo(
    () =>
      reportData.pasteurizationRecords.filter((record) =>
        isWithinRange(record.post_test_date || record.pre_test_date, period),
      ),
    [period, reportData.pasteurizationRecords],
  );

  const filteredDispensing = useMemo(
    () =>
      reportData.transactions.filter((transaction) =>
        isWithinRange(transaction.transaction_date, period),
      ),
    [period, reportData.transactions],
  );

  const reports = {
    collection: {
      title: "Collection Report",
      subtitle: `Filtered by ${period}`,
      headers: ["Date", "Donor", "Batch", "Type", "Volume", "Status"],
      rows: filteredCollections.map((collection) => [
        collection.collection_date,
        names.donorNames[collection.donor_id] || `Donor #${collection.donor_id}`,
        names.batchNames[collection.batch_id] || `Batch #${collection.batch_id}`,
        collection.collection_type,
        `${collection.volume_ml} mL`,
        collection.status,
      ]),
    },
    pasteurization: {
      title: "Pasteurization Report",
      subtitle: `Filtered by ${period}`,
      headers: ["Batch", "Pre-test", "Pre-test Date", "Post-test", "Post-test Date", "Expiration"],
      rows: filteredPasteurization.map((record) => [
        names.batchNames[record.batch_id] || `Batch #${record.batch_id}`,
        record.pre_test_result,
        record.pre_test_date,
        record.post_test_result || "Not recorded",
        record.post_test_date || "Not recorded",
        record.expiration_date || "Not set",
      ]),
    },
    dispensing: {
      title: "Dispensing Report",
      subtitle: `Filtered by ${period}`,
      headers: ["Date", "Recipient", "Batch", "Volume", "Price"],
      rows: filteredDispensing.map((transaction) => [
        transaction.transaction_date,
        names.beneficiaryNames[transaction.beneficiary_id] || `Beneficiary #${transaction.beneficiary_id}`,
        names.batchNames[transaction.batch_id] || `Batch #${transaction.batch_id}`,
        `${transaction.volume_dispensed} mL`,
        money(transaction.price),
      ]),
    },
  };

  const report = reports[reportType];

  if (loading) {
    return <p>Loading reports...</p>;
  }

  return (
    <section>
      <h2>Reports</h2>
      {error && <p className="message">{error}</p>}
      <p>Report views are grouped by week, month, or year.</p>
      <label>
        Report Type
        <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
          <option value="collection">Collection Report</option>
          <option value="pasteurization">Pasteurization Report</option>
          <option value="dispensing">Dispensing Report</option>
        </select>
      </label>
      <label>
        Time Range
        <select value={period} onChange={(event) => setPeriod(event.target.value)}>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
          <option value="year">Yearly</option>
        </select>
      </label>
      <button onClick={() => window.print()} type="button">
        Print
      </button>
      <h3>{report.title}</h3>
      <p>{report.subtitle}</p>
      <Table headers={report.headers} rows={report.rows} />
    </section>
  );
}

export default Reports;
