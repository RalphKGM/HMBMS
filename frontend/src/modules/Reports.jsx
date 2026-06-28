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
  if (range === "all") {
    return null;
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
  const [period, setPeriod] = useState("month");
  const [search, setSearch] = useState("");
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
  const periodLabels = {
    week: "Weekly",
    month: "Monthly",
    year: "Yearly",
    all: "All Time",
  };

  const reportStats = useMemo(() => {
    if (reportType === "collection") {
      return [
        {
          label: "Collections",
          value: filteredCollections.length,
          note: "Donation records in range",
        },
        {
          label: "Collected Volume",
          value: `${filteredCollections.reduce((total, item) => total + Number(item.volume_ml || 0), 0)} mL`,
          note: "Total donor milk collected",
        },
        {
          label: "Donors",
          value: new Set(filteredCollections.map((item) => item.donor_id)).size,
          note: "Unique donors represented",
        },
      ];
    }

    if (reportType === "pasteurization") {
      return [
        {
          label: "Test Records",
          value: filteredPasteurization.length,
          note: "Pasteurization logs in range",
        },
        {
          label: "Passed",
          value: filteredPasteurization.filter((item) => item.post_test_result === "Passed").length,
          note: "Released after post-test",
        },
        {
          label: "Failed",
          value: filteredPasteurization.filter(
            (item) => item.pre_test_result === "Failed" || item.post_test_result === "Failed",
          ).length,
          note: "Rejected during testing",
        },
      ];
    }

    return [
      {
        label: "Transactions",
        value: filteredDispensing.length,
        note: "Dispensing records in range",
      },
      {
        label: "Dispensed Volume",
        value: `${filteredDispensing.reduce((total, item) => total + Number(item.volume_dispensed || 0), 0)} mL`,
        note: "Total milk released",
      },
      {
        label: "Total Price",
        value: money(filteredDispensing.reduce((total, item) => total + Number(item.price || 0), 0)),
        note: "Amount recorded",
      },
    ];
  }, [filteredCollections, filteredDispensing, filteredPasteurization, reportType]);

  const filteredReportRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return report.rows;

    return report.rows.filter((row) =>
      row.some((cell) => String(cell ?? "").toLowerCase().includes(normalizedSearch)),
    );
  }, [report.rows, search]);

  if (loading) {
    return (
      <section>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p>Loading reports...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header">
          <div>
            <h2>Reports</h2>
            <p className="mt-2 max-w-2xl text-sm">
              Generate collection, pasteurization, and dispensing reports by weekly, monthly, yearly, or all-time views.
            </p>
          </div>
        </div>
      </div>

      {error && <p className="message">{error}</p>}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>Report Settings</h3>
            <p className="mt-1 text-sm">
              Choose the report category and time range before reviewing or printing.
            </p>
          </div>
        </div>
        <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
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
              <option value="all">All Time</option>
            </select>
          </label>
          <div className="flex items-end sm:col-span-2">
            <button
              onClick={() => window.print()}
              type="button"
              className="border-blue-600 bg-blue-600 px-4 text-white hover:border-blue-700 hover:bg-blue-700"
            >
              Print Report
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {reportStats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              {stat.label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-[#003b90]">{stat.value}</p>
            <p className="mt-1 text-sm text-slate-500">{stat.note}</p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>{report.title}</h3>
            <p className="mt-1 text-sm">
              {periodLabels[period]} view. Search only affects the table below.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {filteredReportRows.length} of {report.rows.length} {report.rows.length === 1 ? "record" : "records"}
          </span>
        </div>

        <div className="mb-4 max-w-xs">
          <label>
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search current report"
            />
          </label>
        </div>

        {!report.rows.length && (
          <p className="message">No records for this view yet. Try Monthly or All Time.</p>
        )}
        <Table headers={report.headers} rows={filteredReportRows} />
      </div>
    </section>
  );
}

export default Reports;
