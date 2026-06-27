import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";

const initialForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  birthdate: "",
  address: "",
  contactNumber: "",
};

async function fetchDonors(apiBase) {
  const response = await fetch(`${apiBase}/api/donors`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load donors.");
  }

  return body.donors || [];
}

function donorName(donor) {
  return [donor.first_name, donor.middle_name, donor.last_name].filter(Boolean).join(" ") || "-";
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Donors({ currentUser }) {
  const [donors, setDonors] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingDonorId, setEditingDonorId] = useState(null);
  const [editingDonor, setEditingDonor] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmStatusChange, setConfirmStatusChange] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const loadDonors = async () => {
    setLoading(true);
    setError("");

    try {
      setDonors(await fetchDonors(apiBase));
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load donors.");
      setDonors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    fetchDonors(apiBase)
      .then((records) => {
        if (isMounted) setDonors(records);
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load donors.");
        setDonors([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const filteredDonors = useMemo(() => {
    return donors.filter((donor) => {
      const text = `${donor.dtn} ${donorName(donor)} ${donor.contact_number} ${donor.status}`;
      return text.toLowerCase().includes(query.toLowerCase());
    });
  }, [donors, query]);

  const donorStats = useMemo(() => {
    const activeDonors = donors.filter((donor) => donor.status === "Active").length;
    const inactiveDonors = donors.filter((donor) => donor.status !== "Active").length;

    return [
      { label: "Total Donors", value: donors.length, note: "Registered donor records" },
      { label: "Active Donors", value: activeDonors, note: "Eligible for transactions" },
      { label: "Inactive Donors", value: inactiveDonors, note: "Temporarily deactivated" },
    ];
  }, [donors]);

  const donorRows = useMemo(() => {
    return filteredDonors.map((donor) => [
      <span key={`dtn-${donor.donor_id}`} className="font-semibold text-slate-900">
        {donor.dtn}
      </span>,
      donorName(donor),
      donor.contact_number || "-",
      formatDate(donor.birthdate),
      <span
        key={`status-${donor.donor_id}`}
        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
          donor.status === "Active"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {donor.status === "Active" ? "Active" : "Inactive"}
      </span>,
      <button
        key={`edit-${donor.donor_id}`}
        type="button"
        className="min-h-0 border-slate-300 px-3 py-1.5 text-xs"
        onClick={() => startEdit(donor)}
      >
        Edit
      </button>,
    ]);
  }, [filteredDonors]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingDonorId(null);
    setEditingDonor(null);
    setConfirmStatusChange(false);
  }

  const openAddDonorModal = () => {
    setError("");
    setMessage("");
    resetForm();
    setShowForm(true);
  };

  const closeDonorModal = () => {
    if (saving) return;
    setError("");
    resetForm();
    setShowForm(false);
  };

  const saveDonor = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        editingDonorId ? `${apiBase}/api/donors/${editingDonorId}` : `${apiBase}/api/donors`,
        {
          method: editingDonorId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            createdBy: currentUser?.id ?? currentUser?.user_id ?? null,
          }),
        },
      );

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to save donor.");
      }

      setMessage(
        editingDonorId
          ? "Donor profile updated."
          : `Donor saved. Generated DTN: ${body.donor?.dtn || "N/A"}`,
      );
      resetForm();
      setShowForm(false);
      await loadDonors();
    } catch (saveError) {
      setError(saveError.message || "Failed to save donor.");
    } finally {
      setSaving(false);
    }
  }

  const toggleDonor = async (donorId, currentStatus) => {
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/api/donors/${donorId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: currentStatus === "Active" ? "Inactive" : "Active",
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to update donor status.");
      }

      setMessage("Donor status updated.");
      setConfirmStatusChange(false);
      resetForm();
      setShowForm(false);
      await loadDonors();
    } catch (toggleError) {
      setError(toggleError.message || "Failed to update donor status.");
    }
  }

  const startEdit = (donor) => {
    setError("");
    setMessage("");
    setConfirmStatusChange(false);
    setEditingDonor(donor);
    setEditingDonorId(donor.donor_id);
    setForm({
      firstName: donor.first_name || "",
      middleName: donor.middle_name || "",
      lastName: donor.last_name || "",
      birthdate: donor.birthdate || "",
      address: donor.address || "",
      contactNumber: donor.contact_number || "",
    });
    setShowForm(true);
  };

  if (loading) {
    return (
      <section>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p>Loading donors...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header">
          <div>
            <h2>Donor Management</h2>
            <p className="mt-2 max-w-2xl text-sm">
              Review donor records, create new donor profiles, and manage active status.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {donorStats.map((stat) => (
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
      {error && !showForm && <p className="message">{error}</p>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="section-header mb-4">
              <div>
                <h3>{editingDonorId ? "Edit Donor Profile" : "New Donor Profile"}</h3>
                <p className="mt-1 text-sm">
                  {editingDonorId
                    ? "Update donor information or manage the donor account status."
                    : "Encode the donor information to generate a donor tracking number."}
                </p>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-full border-slate-200 bg-slate-50 p-0 text-lg text-slate-600 hover:bg-slate-100"
                onClick={closeDonorModal}
                aria-label="Close donor modal"
              >
                X
              </button>
            </div>

            {error && <p className="message mb-4">{error}</p>}

            <form onSubmit={saveDonor}>
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
                Middle Name
                <input
                  value={form.middleName}
                  onChange={(event) => setForm({ ...form, middleName: event.target.value })}
                  placeholder="Optional"
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
                Birthdate
                <input
                  required
                  type="date"
                  value={form.birthdate}
                  onChange={(event) => setForm({ ...form, birthdate: event.target.value })}
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
                <button type="button" onClick={closeDonorModal} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700"
                  disabled={saving}
                >
                  {saving ? "Saving..." : editingDonorId ? "Update Donor" : "Save Donor"}
                </button>
              </div>
            </form>

            {editingDonor && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="section-header">
                  <div>
                    <h3 className="text-base">Donor Status</h3>
                    <p className="mt-1 text-sm">
                      Current status:{" "}
                      <span
                        className={`font-bold ${
                          editingDonor.status === "Active" ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        {editingDonor.status === "Active" ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                  {!confirmStatusChange && (
                    <button
                      type="button"
                      className={`${
                        editingDonor.status === "Active"
                          ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
                      }`}
                      disabled={saving}
                      onClick={() => setConfirmStatusChange(true)}
                    >
                      {editingDonor.status === "Active" ? "Deactivate Donor" : "Activate Donor"}
                    </button>
                  )}
                </div>

                {confirmStatusChange && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-900">
                      {editingDonor.status === "Active"
                        ? `Deactivate ${donorName(editingDonor)}?`
                        : `Activate ${donorName(editingDonor)}?`}
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                      {editingDonor.status === "Active"
                        ? "Inactive donors will remain in records but should not be selected for new collection workflows."
                        : "Active donors can be selected again for milk collection workflows."}
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
                          editingDonor.status === "Active"
                            ? "border-rose-600 bg-rose-600 text-white hover:border-rose-700 hover:bg-rose-700"
                            : "border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700"
                        }`}
                        disabled={saving}
                        onClick={() => toggleDonor(editingDonor.donor_id, editingDonor.status)}
                      >
                        {saving
                          ? "Saving..."
                          : editingDonor.status === "Active"
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>Donor List</h3>
            <p className="mt-1 text-sm">View donor profiles and open records for editing.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
              {filteredDonors.length} {filteredDonors.length === 1 ? "record" : "records"}
            </span>
            <button
              type="button"
              className="border-blue-600 bg-blue-600 px-4 text-white hover:border-blue-700 hover:bg-blue-700"
              onClick={openAddDonorModal}
            >
              Add Donor
            </button>
          </div>
        </div>
        <label className="mb-4">
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by DTN, name, contact, or status"
          />
        </label>
        <Table
          headers={["DTN", "Name", "Contact", "Birthdate", "Status", "Action"]}
          rows={donorRows}
        />
      </div>
    </section>
  );
}

export default Donors;
