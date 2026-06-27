import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";
import { fullName, money } from "../utils/helpers";

const initialForm = {
  beneficiaryId: "",
  batchId: "",
  approvedBy: "",
  volumeDispensed: "",
  price: "",
};

const emptyInquiryData = {
  inquiries: [],
  beneficiaries: [],
  users: [],
};

async function fetchBeneficiaries(apiBase) {
  const response = await fetch(`${apiBase}/api/beneficiaries`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load beneficiaries.");
  }

  return body.beneficiaries || [];
}

async function fetchUsers(apiBase) {
  const response = await fetch(`${apiBase}/api/users`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load users.");
  }

  return body.users || [];
}

async function fetchDispensingData(apiBase) {
  const response = await fetch(`${apiBase}/api/dispensing`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load dispensing data.");
  }

  return {
    batches: body.batches || [],
    transactions: body.transactions || [],
  };
}

async function fetchPendingInquiries(apiBase) {
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

function Dispensing({ currentUser }) {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [inquiryData, setInquiryData] = useState(emptyInquiryData);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const loadDispensingData = async () => {
    setLoading(true);
    setError("");

    try {
      const [dispensingData, pendingInquiryData] = await Promise.all([
        fetchDispensingData(apiBase),
        fetchPendingInquiries(apiBase),
      ]);
      setBatches(dispensingData.batches);
      setTransactions(dispensingData.transactions);
      setInquiryData(pendingInquiryData);
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load dispensing data.");
      setBatches([]);
      setTransactions([]);
      setInquiryData(emptyInquiryData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetchBeneficiaries(apiBase),
      fetchUsers(apiBase),
      fetchDispensingData(apiBase),
      fetchPendingInquiries(apiBase),
    ])
      .then(([beneficiaryRecords, userRecords, dispensingData, pendingInquiryData]) => {
        if (!isMounted) return;
        setBeneficiaries(beneficiaryRecords);
        setUsers(userRecords);
        setBatches(dispensingData.batches);
        setTransactions(dispensingData.transactions);
        setInquiryData(pendingInquiryData);
        setForm((current) => ({
          ...current,
          approvedBy: userRecords.find((user) => user.role === "Doctor")?.user_id || "",
        }));
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load dispensing data.");
        setBeneficiaries([]);
        setUsers([]);
        setBatches([]);
        setTransactions([]);
        setInquiryData(emptyInquiryData);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const beneficiaryNames = useMemo(() => {
    return beneficiaries.reduce((names, beneficiary) => {
      names[beneficiary.beneficiary_id] = fullName({
        firstName: beneficiary.first_name,
        lastName: beneficiary.last_name,
      });
      return names;
    }, {});
  }, [beneficiaries]);

  const batchNames = useMemo(() => {
    return batches.reduce((names, batch) => {
      names[batch.batch_id] = batch.batch_number;
      return names;
    }, {});
  }, [batches]);

  const doctors = users.filter((user) => user.role === "Doctor");
  const activeBeneficiaries = beneficiaries.filter((beneficiary) => beneficiary.is_active);
  const pendingInquiries = inquiryData.inquiries.filter((inquiry) => inquiry.status === "Pending");

  const useInquiry = (inquiry) => {
    setForm((current) => ({
      ...current,
      beneficiaryId: String(inquiry.beneficiary_id),
      volumeDispensed:
        inquiry.requested_volume_ml != null ? String(inquiry.requested_volume_ml) : current.volumeDispensed,
    }));
    setMessage(`Loaded pending inquiry for ${beneficiaryNames[inquiry.beneficiary_id] || "beneficiary"}.`);
    setError("");
  };

  const saveTransaction = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/api/dispensing/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beneficiaryId: form.beneficiaryId,
          batchId: form.batchId,
          volumeDispensed: form.volumeDispensed,
          price: form.price,
          approvedBy: form.approvedBy,
          dispensedBy: currentUser?.id ?? currentUser?.user_id ?? null,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to save dispensing transaction.");
      }

      setMessage("Dispensing saved. Inventory was allocated across available batches.");
      setForm({
        ...initialForm,
        approvedBy: doctors[0]?.user_id || "",
      });
      await loadDispensingData();
    } catch (saveError) {
      setError(saveError.message || "Failed to save dispensing transaction.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading dispensing records...</p>;
  }

  return (
    <section>
      <h2>Milk Dispensing</h2>
      {error && <p className="message">{error}</p>}
      {message && <p className="message">{message}</p>}

      <form onSubmit={saveTransaction}>
        <label>
          Beneficiary
          <select
            required
            value={form.beneficiaryId}
            onChange={(event) => setForm({ ...form, beneficiaryId: event.target.value })}
          >
            <option value="">Select beneficiary</option>
            {activeBeneficiaries.map((beneficiary) => (
              <option key={beneficiary.beneficiary_id} value={beneficiary.beneficiary_id}>
                {beneficiaryNames[beneficiary.beneficiary_id]}
              </option>
            ))}
          </select>
        </label>
        <p className="message">Milk will be auto-allocated from available batches. Batch selection is optional.</p>
        <label>
          Preferred Batch
          <select
            value={form.batchId}
            onChange={(event) => setForm({ ...form, batchId: event.target.value })}
          >
            <option value="">Auto-allocate across batches</option>
            {batches.map((batch) => (
              <option key={batch.batch_id} value={batch.batch_id}>
                {batch.batch_number} - {batch.available_volume} mL
              </option>
            ))}
          </select>
        </label>
        <label>
          Doctor Approval
          <select
            value={form.approvedBy}
            onChange={(event) => setForm({ ...form, approvedBy: event.target.value })}
          >
            <option value="">Select doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.user_id} value={doctor.user_id}>
                {[doctor.first_name, doctor.last_name].filter(Boolean).join(" ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Volume Dispensed{" "}
          <input
            required
            min="1"
            type="number"
            value={form.volumeDispensed}
            onChange={(event) => setForm({ ...form, volumeDispensed: event.target.value })}
          />
        </label>
        <label>
          Price{" "}
          <input
            required
            min="0"
            type="number"
            value={form.price}
            onChange={(event) => setForm({ ...form, price: event.target.value })}
          />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Transaction"}
        </button>
      </form>

      <h3>Pending Inquiries</h3>
      <Table
        headers={["Beneficiary", "Requested mL", "Inquiry Date", "Action"]}
        rows={pendingInquiries.map((inquiry) => [
          beneficiaryNames[inquiry.beneficiary_id] || `Beneficiary #${inquiry.beneficiary_id}`,
          inquiry.requested_volume_ml != null ? `${inquiry.requested_volume_ml} mL` : "Not set",
          inquiry.inquiry_date,
          <button key={`use-${inquiry.inquiry_id}`} type="button" onClick={() => useInquiry(inquiry)}>
            Use Inquiry
          </button>,
        ])}
      />

      <h3>Transactions</h3>
      <Table
        headers={["Recipient", "Batch", "Volume", "Price", "Date"]}
        rows={transactions.map((transaction) => [
          beneficiaryNames[transaction.beneficiary_id] || "Unknown",
          batchNames[transaction.batch_id] || `Batch #${transaction.batch_id}`,
          `${transaction.volume_dispensed} mL`,
          money(transaction.price),
          transaction.transaction_date,
        ])}
      />
    </section>
  );
}

export default Dispensing;
