import { useEffect, useMemo, useState } from "react";
import SearchSelect from "../components/SearchSelect";
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
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [inquirySearch, setInquirySearch] = useState("");
  const [transactionSearch, setTransactionSearch] = useState("");
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
  const beneficiarySearchOptions = useMemo(
    () =>
      activeBeneficiaries.map((beneficiary) => ({
        value: beneficiary.beneficiary_id,
        label: beneficiaryNames[beneficiary.beneficiary_id] || `Beneficiary #${beneficiary.beneficiary_id}`,
        description: beneficiary.contact_number,
      })),
    [activeBeneficiaries, beneficiaryNames],
  );
  const doctorSearchOptions = useMemo(
    () =>
      doctors.map((doctor) => ({
        value: doctor.user_id,
        label: [doctor.first_name, doctor.last_name].filter(Boolean).join(" ") || doctor.username,
        description: doctor.username,
      })),
    [doctors],
  );
  const pendingInquiries = useMemo(() => {
    return inquiryData.inquiries
      .filter((inquiry) => inquiry.status === "Pending")
      .slice()
      .sort((left, right) => {
        const dateCompare = String(left.inquiry_date || "").localeCompare(String(right.inquiry_date || ""));
        if (dateCompare !== 0) return dateCompare;
        return Number(left.inquiry_id || 0) - Number(right.inquiry_id || 0);
      });
  }, [inquiryData.inquiries]);

  const filteredPendingInquiries = useMemo(() => {
    const normalizedSearch = inquirySearch.trim().toLowerCase();

    return pendingInquiries.filter((inquiry) => {
      const beneficiaryName = beneficiaryNames[inquiry.beneficiary_id] || "";
      const searchableText = [
        beneficiaryName,
        inquiry.requested_volume_ml,
        inquiry.inquiry_date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !normalizedSearch || searchableText.includes(normalizedSearch);
    });
  }, [beneficiaryNames, inquirySearch, pendingInquiries]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = transactionSearch.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const beneficiaryName = beneficiaryNames[transaction.beneficiary_id] || "";
      const batchName = batchNames[transaction.batch_id] || `Batch #${transaction.batch_id}`;
      const searchableText = [
        beneficiaryName,
        batchName,
        transaction.volume_dispensed,
        transaction.transaction_date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !normalizedSearch || searchableText.includes(normalizedSearch);
    });
  }, [batchNames, beneficiaryNames, transactionSearch, transactions]);

  const dispensingStats = useMemo(
    () => [
      {
        label: "Available Milk",
        value: `${batches.reduce((total, batch) => total + Number(batch.available_volume || 0), 0)} mL`,
        note: "Ready for dispensing",
      },
      {
        label: "Pending Inquiries",
        value: pendingInquiries.length,
        note: "Waiting to be fulfilled",
      },
      {
        label: "Transactions",
        value: transactions.length,
        note: "Recorded dispensing logs",
      },
    ],
    [batches, pendingInquiries.length, transactions.length],
  );

  const closeTransactionModal = () => {
    if (saving) return;
    setShowTransactionModal(false);
    setForm({
      ...initialForm,
      approvedBy: doctors[0]?.user_id || "",
    });
  };

  const applyInquiry = (inquiry) => {
    setForm((current) => ({
      ...current,
      beneficiaryId: String(inquiry.beneficiary_id),
      volumeDispensed:
        inquiry.requested_volume_ml != null ? String(inquiry.requested_volume_ml) : current.volumeDispensed,
    }));
    setMessage(`Loaded pending inquiry for ${beneficiaryNames[inquiry.beneficiary_id] || "beneficiary"}.`);
    setError("");
    setShowTransactionModal(true);
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
      setShowTransactionModal(false);
      await loadDispensingData();
    } catch (saveError) {
      setError(saveError.message || "Failed to save dispensing transaction.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p>Loading dispensing records...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header">
          <div>
            <h2>Milk Dispensing</h2>
            <p className="mt-2 max-w-2xl text-sm">
              Fulfill pending beneficiary inquiries and record milk dispensing transactions.
            </p>
          </div>
          <button
            type="button"
            className="border-blue-600 bg-blue-600 px-4 text-white hover:border-blue-700 hover:bg-blue-700"
            onClick={() => setShowTransactionModal(true)}
          >
            New Transaction
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {dispensingStats.map((stat) => (
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
      {message && <p className="message">{message}</p>}

      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="section-header mb-4">
              <div>
                <h3>Dispense Milk</h3>
                <p className="mt-1 text-sm">
                  Milk will be auto-allocated from available batches unless a preferred batch is selected.
                </p>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-full border-slate-200 bg-slate-50 p-0 text-lg text-slate-600 hover:bg-slate-100"
                onClick={closeTransactionModal}
                aria-label="Close dispensing modal"
              >
                X
              </button>
            </div>

            <form onSubmit={saveTransaction}>
              <SearchSelect
                label="Beneficiary"
                required
                value={form.beneficiaryId}
                options={beneficiarySearchOptions}
                placeholder="Type beneficiary name or contact"
                onChange={(nextValue) => setForm({ ...form, beneficiaryId: nextValue })}
              />
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
              <SearchSelect
                label="Doctor Approval"
                value={form.approvedBy}
                options={doctorSearchOptions}
                placeholder="Type doctor name"
                onChange={(nextValue) => setForm({ ...form, approvedBy: nextValue })}
              />
              <label>
                Volume Dispensed
                <input
                  required
                  min="1"
                  type="number"
                  value={form.volumeDispensed}
                  onChange={(event) => setForm({ ...form, volumeDispensed: event.target.value })}
                />
              </label>
              <label>
                Price
                <input
                  required
                  min="0"
                  type="number"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                />
              </label>
              <p className="message sm:col-span-2 xl:col-span-3">
                Leave Preferred Batch blank to allocate across multiple available batches.
              </p>
              <div className="flex flex-wrap justify-end gap-3 sm:col-span-2 xl:col-span-3">
                <button type="button" onClick={closeTransactionModal} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>Pending Inquiries</h3>
            <p className="mt-1 text-sm">
              Use an inquiry to prefill the beneficiary and requested milk volume.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {filteredPendingInquiries.length} of {pendingInquiries.length}{" "}
            {pendingInquiries.length === 1 ? "inquiry" : "inquiries"}
          </span>
        </div>
        <div className="mb-4 max-w-xs">
          <label>
            Search
            <input
              value={inquirySearch}
              onChange={(event) => setInquirySearch(event.target.value)}
              placeholder="Search beneficiary or date"
            />
          </label>
        </div>
        <Table
          headers={["Beneficiary", "Requested mL", "Inquiry Date", "Action"]}
          rows={filteredPendingInquiries.map((inquiry) => [
            <span key={`beneficiary-${inquiry.inquiry_id}`} className="font-semibold text-slate-900">
              {beneficiaryNames[inquiry.beneficiary_id] || `Beneficiary #${inquiry.beneficiary_id}`}
            </span>,
            inquiry.requested_volume_ml != null ? `${inquiry.requested_volume_ml} mL` : "Not set",
            inquiry.inquiry_date,
            <button
              key={`use-${inquiry.inquiry_id}`}
              type="button"
              className="min-h-0 border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:border-blue-300 hover:bg-blue-100"
              onClick={() => applyInquiry(inquiry)}
            >
              Dispense
            </button>,
          ])}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>Transactions</h3>
            <p className="mt-1 text-sm">
              Review completed dispensing records and allocated batches.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {filteredTransactions.length} of {transactions.length}{" "}
            {transactions.length === 1 ? "record" : "records"}
          </span>
        </div>
        <div className="mb-4 max-w-xs">
          <label>
            Search
            <input
              value={transactionSearch}
              onChange={(event) => setTransactionSearch(event.target.value)}
              placeholder="Search recipient, batch, or date"
            />
          </label>
        </div>
        <Table
          headers={["Recipient", "Batch", "Volume", "Price", "Date"]}
          rows={filteredTransactions.map((transaction) => [
            <span key={`recipient-${transaction.transaction_id}`} className="font-semibold text-slate-900">
              {beneficiaryNames[transaction.beneficiary_id] || "Unknown"}
            </span>,
            batchNames[transaction.batch_id] || `Batch #${transaction.batch_id}`,
            `${transaction.volume_dispensed} mL`,
            money(transaction.price),
            transaction.transaction_date,
          ])}
        />
      </div>
    </section>
  );
}

export default Dispensing;
