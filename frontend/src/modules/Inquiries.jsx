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

  const rows = filteredInquiries.map((inquiry, index) => [
    index + 1,
    names.beneficiaryNames[inquiry.beneficiary_id] || `Beneficiary #${inquiry.beneficiary_id}`,
    inquiry.requested_volume_ml != null ? `${inquiry.requested_volume_ml} mL` : "Not set",
    inquiry.inquiry_date,
    inquiry.status,
    names.userNames[inquiry.logged_by] || "Unknown",
  ]);

  if (loading) {
    return <p>Loading inquiries...</p>;
  }

  return (
    <section>
      <h2>Inquiry Log</h2>
      <p>Entries are ordered by newest inquiry first and include the requested mL.</p>
      {error && <p className="message">{error}</p>}
      <label>
        Search{" "}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search beneficiary, volume, date, or status"
        />
      </label>{" "}
      <label>
        Status{" "}
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All</option>
          <option value="Pending">Pending</option>
          <option value="Fulfilled">Fulfilled</option>
        </select>
      </label>
      <Table
        headers={["#", "Beneficiary", "Requested mL", "Inquiry Date", "Status", "Logged By"]}
        rows={rows}
      />
    </section>
  );
}

export default Inquiries;
