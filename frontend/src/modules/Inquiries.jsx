import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";
import { fullName } from "../utils/helpers";

const emptyInquiryData = {
  inquiries: [],
  beneficiaries: [],
  users: [],
};

async function fetchInquiriesData(apiBase) {
  const response = await fetch(`${apiBase}/api/inquiries`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load inquiries.");
  }

  return {
    ...emptyInquiryData,
    ...body,
  };
}

function Inquiries() {
  const [data, setData] = useState(emptyInquiryData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

  useEffect(() => {
    let isMounted = true;

    fetchInquiriesData(apiBase)
      .then((nextData) => {
        if (isMounted) setData(nextData);
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load inquiries.");
        setData(emptyInquiryData);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const names = useMemo(() => {
    const beneficiaryNames = data.beneficiaries.reduce((items, beneficiary) => {
      items[beneficiary.beneficiary_id] = fullName({
        firstName: beneficiary.first_name,
        lastName: beneficiary.last_name,
      });
      return items;
    }, {});

    const userNames = data.users.reduce((items, user) => {
      items[user.user_id] = fullName({
        firstName: user.first_name,
        lastName: user.last_name,
      }) || user.username;
      return items;
    }, {});

    return { beneficiaryNames, userNames };
  }, [data.beneficiaries, data.users]);

  const filteredInquiries = useMemo(() => {
    return data.inquiries.filter((inquiry) => {
      const beneficiaryName =
        names.beneficiaryNames[inquiry.beneficiary_id] || `Beneficiary #${inquiry.beneficiary_id}`;
      const text = `${beneficiaryName} ${inquiry.requested_volume_ml ?? ""} ${inquiry.inquiry_date} ${
        inquiry.status
      } ${names.userNames[inquiry.logged_by] || "Unknown"}`;
      const matchesQuery = text.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || inquiry.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [data.inquiries, names.beneficiaryNames, names.userNames, query, statusFilter]);

  const inquiryStats = useMemo(() => {
    const pendingCount = data.inquiries.filter((inquiry) => inquiry.status === "Pending").length;
    const fulfilledCount = data.inquiries.filter((inquiry) => inquiry.status === "Fulfilled").length;

    return [
      { label: "Total Inquiries", value: data.inquiries.length, note: "All logged requests" },
      { label: "Pending", value: pendingCount, note: "Waiting for dispensing" },
      { label: "Fulfilled", value: fulfilledCount, note: "Already completed" },
    ];
  }, [data.inquiries]);

  const rows = filteredInquiries.map((inquiry, index) => [
    <span key={`number-${inquiry.inquiry_id}`} className="font-semibold text-slate-800">
      #{index + 1}
    </span>,
    names.beneficiaryNames[inquiry.beneficiary_id] || `Beneficiary #${inquiry.beneficiary_id}`,
    inquiry.requested_volume_ml != null ? `${inquiry.requested_volume_ml} mL` : "Not set",
    inquiry.inquiry_date,
    <span
      key={`status-${inquiry.inquiry_id}`}
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        inquiry.status === "Fulfilled"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {inquiry.status}
    </span>,
    names.userNames[inquiry.logged_by] || "Unknown",
  ]);

  if (loading) {
    return (
      <section>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p>Loading inquiries...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header">
          <div>
            <h2>Inquiry Log</h2>
            <p className="mt-2 max-w-2xl text-sm">
              Review milk requests, requested volume, inquiry status, and staff logging details.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {inquiryStats.map((stat) => (
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

      {error && <p className="message">{error}</p>}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>Inquiry Filters</h3>
            <p className="mt-1 text-sm">Search and filter inquiry records before reviewing the table.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {filteredInquiries.length} {filteredInquiries.length === 1 ? "record" : "records"}
          </span>
        </div>
        <form>
          <label>
            Search
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search beneficiary, volume, date, status, or staff"
            />
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="Pending">Pending</option>
              <option value="Fulfilled">Fulfilled</option>
            </select>
          </label>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>Inquiry Records</h3>
            <p className="mt-1 text-sm">Entries are ordered by newest inquiry first.</p>
          </div>
        </div>
        <Table
          headers={["#", "Beneficiary", "Requested mL", "Inquiry Date", "Status", "Logged By"]}
          rows={rows}
        />
      </div>
    </section>
  );
}

export default Inquiries;
