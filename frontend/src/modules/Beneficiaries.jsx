import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";
import { fullName } from "../utils/helpers";

const initialForm = {
  firstName: "",
  lastName: "",
  contactNumber: "",
  address: "",
};

const initialInquiryForm = {
  beneficiaryId: "",
  requestedVolumeMl: "",
};

async function fetchBeneficiaries(apiBase) {
  const response = await fetch(`${apiBase}/api/beneficiaries`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load beneficiaries.");
  }

  return body.beneficiaries || [];
}

async function fetchInquiries(apiBase, beneficiaryId) {
  const response = await fetch(`${apiBase}/api/beneficiaries/${beneficiaryId}/inquiries`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load inquiries.");
  }

  return body.inquiries || [];
}

async function createInquiry(apiBase, beneficiaryId, payload) {
  const response = await fetch(`${apiBase}/api/beneficiaries/${beneficiaryId}/inquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to log inquiry.");
  }

  return body.inquiry;
}

function beneficiaryName(beneficiary) {
  return fullName({
    firstName: beneficiary?.first_name,
    lastName: beneficiary?.last_name,
  });
}

function Beneficiaries({ currentUser }) {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingBeneficiaryId, setEditingBeneficiaryId] = useState(null);
  const [editingBeneficiary, setEditingBeneficiary] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmStatusChange, setConfirmStatusChange] = useState(false);
  const [inquiryForm, setInquiryForm] = useState(initialInquiryForm);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquirySaving, setInquirySaving] = useState(false);
  const [inquiryBeneficiary, setInquiryBeneficiary] = useState(null);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const loadBeneficiaries = async () => {
    setLoading(true);
    setError("");

    try {
      setBeneficiaries(await fetchBeneficiaries(apiBase));
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load beneficiaries.");
      setBeneficiaries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    fetchBeneficiaries(apiBase)
      .then((records) => {
        if (isMounted) setBeneficiaries(records);
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load beneficiaries.");
        setBeneficiaries([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter((beneficiary) => {
      const text = `${beneficiaryName(beneficiary)} ${beneficiary.contact_number} ${
        beneficiary.address
      } ${beneficiary.is_active ? "Active" : "Inactive"}`;
      return text.toLowerCase().includes(query.toLowerCase());
    });
  }, [beneficiaries, query]);

  const beneficiaryStats = useMemo(() => {
    const activeBeneficiaries = beneficiaries.filter((beneficiary) => beneficiary.is_active).length;
    const inactiveBeneficiaries = beneficiaries.length - activeBeneficiaries;

    return [
      { label: "Total Beneficiaries", value: beneficiaries.length, note: "Registered records" },
      { label: "Active Beneficiaries", value: activeBeneficiaries, note: "Eligible for inquiries" },
      { label: "Inactive Beneficiaries", value: inactiveBeneficiaries, note: "Currently deactivated" },
    ];
  }, [beneficiaries]);

  const beneficiaryRows = useMemo(() => {
    return filteredBeneficiaries.map((beneficiary) => [
      <span key={`name-${beneficiary.beneficiary_id}`} className="font-semibold text-slate-900">
        {beneficiaryName(beneficiary)}
      </span>,
      beneficiary.contact_number,
      beneficiary.address,
      <span
        key={`status-${beneficiary.beneficiary_id}`}
        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
          beneficiary.is_active
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {beneficiary.is_active ? "Active" : "Inactive"}
      </span>,
      <div key={`actions-${beneficiary.beneficiary_id}`} className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-0 border-slate-300 px-3 py-1.5 text-xs"
          onClick={() => startEdit(beneficiary)}
        >
          Edit
        </button>
        <button
          type="button"
          className="min-h-0 border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:border-blue-300 hover:bg-blue-100"
          onClick={() => startInquiry(beneficiary)}
        >
          Log Inquiry
        </button>
        <button
          type="button"
          className="min-h-0 border-slate-300 px-3 py-1.5 text-xs"
          onClick={() => loadInquiries(beneficiary)}
        >
          View Inquiries
        </button>
      </div>,
    ]);
  }, [filteredBeneficiaries]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingBeneficiaryId(null);
    setEditingBeneficiary(null);
    setConfirmStatusChange(false);
  };

  const resetInquiryForm = () => {
    setInquiryForm(initialInquiryForm);
  };

  const openAddBeneficiaryModal = () => {
    setError("");
    setMessage("");
    resetForm();
    setShowForm(true);
  };

  const closeBeneficiaryModal = () => {
    if (saving) return;
    setError("");
    resetForm();
    setShowForm(false);
  };

  const closeInquiryModal = () => {
    if (inquirySaving) return;
    setError("");
    resetInquiryForm();
    setInquiryBeneficiary(null);
    setShowInquiryForm(false);
  };

  const loadInquiries = async (beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setLoadingInquiries(true);
    setError("");

    try {
      setInquiries(await fetchInquiries(apiBase, beneficiary.beneficiary_id));
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load inquiries.");
      setInquiries([]);
    } finally {
      setLoadingInquiries(false);
    }
  };

  const startInquiry = (beneficiary) => {
    setInquiryForm({
      beneficiaryId: String(beneficiary.beneficiary_id),
      requestedVolumeMl: "",
    });
    setInquiryBeneficiary(beneficiary);
    setShowInquiryForm(true);
    setMessage("");
    setError("");
  };

  const saveInquiry = async (event) => {
    event.preventDefault();
    setInquirySaving(true);
    setError("");
    setMessage("");

    const beneficiaryId = Number(inquiryForm.beneficiaryId);
    const requestedVolumeMl = Number(inquiryForm.requestedVolumeMl);

    if (!Number.isInteger(beneficiaryId)) {
      setError("No beneficiary selected for this inquiry.");
      setInquirySaving(false);
      return;
    }

    if (!Number.isFinite(requestedVolumeMl) || requestedVolumeMl <= 0) {
      setError("Requested mL must be a positive number.");
      setInquirySaving(false);
      return;
    }

    try {
      await createInquiry(apiBase, beneficiaryId, {
        loggedBy: currentUser?.id ?? currentUser?.user_id ?? null,
        requestedVolumeMl,
      });

      setMessage("Milk availability inquiry logged.");
      resetInquiryForm();
      setInquiryBeneficiary(null);
      setShowInquiryForm(false);
    } catch (inquiryError) {
      setError(inquiryError.message || "Failed to log inquiry.");
    } finally {
      setInquirySaving(false);
    }
  };

  const saveBeneficiary = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        editingBeneficiaryId
          ? `${apiBase}/api/beneficiaries/${editingBeneficiaryId}`
          : `${apiBase}/api/beneficiaries`,
        {
          method: editingBeneficiaryId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            createdBy: currentUser?.id ?? currentUser?.user_id ?? null,
          }),
        },
      );
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to save beneficiary.");
      }

      setMessage(
        editingBeneficiaryId
          ? "Beneficiary profile updated."
          : `Beneficiary ${beneficiaryName(body.beneficiary)} registered.`,
      );
      resetForm();
      setShowForm(false);
      await loadBeneficiaries();
    } catch (saveError) {
      setError(saveError.message || "Failed to save beneficiary.");
    } finally {
      setSaving(false);
    }
  };

  const toggleBeneficiary = async (beneficiary) => {
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${apiBase}/api/beneficiaries/${beneficiary.beneficiary_id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !beneficiary.is_active }),
        },
      );
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to update beneficiary status.");
      }

      setMessage("Beneficiary status updated.");
      setConfirmStatusChange(false);
      resetForm();
      setShowForm(false);
      await loadBeneficiaries();
    } catch (toggleError) {
      setError(toggleError.message || "Failed to update beneficiary status.");
    }
  };

  const startEdit = (beneficiary) => {
    setEditingBeneficiaryId(beneficiary.beneficiary_id);
    setEditingBeneficiary(beneficiary);
    setConfirmStatusChange(false);
    setForm({
      firstName: beneficiary.first_name || "",
      lastName: beneficiary.last_name || "",
      contactNumber: beneficiary.contact_number || "",
      address: beneficiary.address || "",
    });
    setMessage("");
    setError("");
    setShowForm(true);
  };

  if (loading) {
    return (
      <section>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p>Loading beneficiaries...</p>
        </div>
      </section>
    );
  }

  const selectedName = selectedBeneficiary ? beneficiaryName(selectedBeneficiary) : "";
  const inquiryName = inquiryBeneficiary ? beneficiaryName(inquiryBeneficiary) : "";

  return (
    <section className="gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header">
          <div>
            <h2>Beneficiary Management</h2>
            <p className="mt-2 max-w-2xl text-sm">
              Review beneficiary profiles, log milk inquiries, and manage active status.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {beneficiaryStats.map((stat) => (
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

      {message && <p className="message">{message}</p>}
      {error && !showForm && !showInquiryForm && <p className="message">{error}</p>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="section-header mb-4">
              <div>
                <h3>{editingBeneficiaryId ? "Edit Beneficiary Profile" : "New Beneficiary Profile"}</h3>
                <p className="mt-1 text-sm">
                  {editingBeneficiaryId
                    ? "Update beneficiary information or manage profile status."
                    : "Encode beneficiary details for milk inquiry and dispensing workflows."}
                </p>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-full border-slate-200 bg-slate-50 p-0 text-lg text-slate-600 hover:bg-slate-100"
                onClick={closeBeneficiaryModal}
                aria-label="Close beneficiary modal"
              >
                X
              </button>
            </div>

            {error && <p className="message mb-4">{error}</p>}

            <form onSubmit={saveBeneficiary}>
              <label>
                First Name
                <input
                  required
                  value={form.firstName}
                  onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                  placeholder="Given name"
                />
              </label>
              <label>
                Last Name
                <input
                  required
                  value={form.lastName}
                  onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                  placeholder="Family name"
                />
              </label>
              <label>
                Contact Number
                <input
                  required
                  value={form.contactNumber}
                  onChange={(event) => setForm({ ...form, contactNumber: event.target.value })}
                  placeholder="Phone number"
                />
              </label>
              <label>
                Address
                <textarea
                  required
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  placeholder="Complete address"
                />
              </label>
              <div className="flex flex-wrap justify-end gap-3 sm:col-span-2 xl:col-span-3">
                <button type="button" onClick={closeBeneficiaryModal} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingBeneficiaryId
                      ? "Update Beneficiary"
                      : "Save Beneficiary"}
                </button>
              </div>
            </form>

            {editingBeneficiary && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="section-header">
                  <div>
                    <h3 className="text-base">Beneficiary Status</h3>
                    <p className="mt-1 text-sm">
                      Current status:{" "}
                      <span
                        className={`font-bold ${
                          editingBeneficiary.is_active ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        {editingBeneficiary.is_active ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                  {!confirmStatusChange && (
                    <button
                      type="button"
                      className={`${
                        editingBeneficiary.is_active
                          ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
                      }`}
                      disabled={saving}
                      onClick={() => setConfirmStatusChange(true)}
                    >
                      {editingBeneficiary.is_active
                        ? "Deactivate Beneficiary"
                        : "Activate Beneficiary"}
                    </button>
                  )}
                </div>

                {confirmStatusChange && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-900">
                      {editingBeneficiary.is_active
                        ? `Deactivate ${beneficiaryName(editingBeneficiary)}?`
                        : `Activate ${beneficiaryName(editingBeneficiary)}?`}
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                      {editingBeneficiary.is_active
                        ? "Inactive beneficiaries remain in history but should not be selected for new transactions."
                        : "Active beneficiaries can be selected again for inquiries and dispensing."}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setConfirmStatusChange(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={`${
                          editingBeneficiary.is_active
                            ? "border-rose-600 bg-rose-600 text-white hover:border-rose-700 hover:bg-rose-700"
                            : "border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700"
                        }`}
                        disabled={saving}
                        onClick={() => toggleBeneficiary(editingBeneficiary)}
                      >
                        {saving
                          ? "Saving..."
                          : editingBeneficiary.is_active
                            ? "Yes, Deactivate"
                            : "Yes, Activate"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showInquiryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="section-header mb-4">
              <div>
                <h3>Log Milk Inquiry</h3>
                <p className="mt-1 text-sm">
                  Record requested milk volume for {inquiryName || "the selected beneficiary"}.
                </p>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-full border-slate-200 bg-slate-50 p-0 text-lg text-slate-600 hover:bg-slate-100"
                onClick={closeInquiryModal}
                aria-label="Close inquiry modal"
              >
                X
              </button>
            </div>

            {error && <p className="message mb-4">{error}</p>}

            <form onSubmit={saveInquiry}>
              <label>
                Requested mL
                <input
                  required
                  min="1"
                  type="number"
                  value={inquiryForm.requestedVolumeMl}
                  onChange={(event) =>
                    setInquiryForm({ ...inquiryForm, requestedVolumeMl: event.target.value })
                  }
                  placeholder="Example: 240"
                />
              </label>
              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" onClick={closeInquiryModal} disabled={inquirySaving}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700"
                  disabled={inquirySaving}
                >
                  {inquirySaving ? "Logging..." : "Log Inquiry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>Beneficiary List</h3>
            <p className="mt-1 text-sm">View beneficiary profiles and open records for actions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
              {filteredBeneficiaries.length}{" "}
              {filteredBeneficiaries.length === 1 ? "record" : "records"}
            </span>
            <button
              type="button"
              className="border-blue-600 bg-blue-600 px-4 text-white hover:border-blue-700 hover:bg-blue-700"
              onClick={openAddBeneficiaryModal}
            >
              Add Beneficiary
            </button>
          </div>
        </div>
        <label className="mb-4">
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, contact, address, or status"
          />
        </label>
        <Table
          headers={["Name", "Contact", "Address", "Status", "Actions"]}
          rows={beneficiaryRows}
        />
      </div>

      {selectedBeneficiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="section-header mb-4">
              <div>
                <h3>Inquiry History - {selectedName}</h3>
                <p className="mt-1 text-sm">Recorded milk availability inquiries for this beneficiary.</p>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-full border-slate-200 bg-slate-50 p-0 text-lg text-slate-600 hover:bg-slate-100"
                onClick={() => {
                  setSelectedBeneficiary(null);
                  setInquiries([]);
                }}
                aria-label="Close inquiry history modal"
              >
                X
              </button>
            </div>

            {loadingInquiries ? (
              <p>Loading inquiries...</p>
            ) : (
              <Table
                headers={["Requested mL", "Inquiry Date", "Status"]}
                rows={inquiries.map((inquiry) => [
                  inquiry.requested_volume_ml != null
                    ? `${inquiry.requested_volume_ml} mL`
                    : "Not set",
                  inquiry.inquiry_date,
                  inquiry.status,
                ])}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default Beneficiaries;
