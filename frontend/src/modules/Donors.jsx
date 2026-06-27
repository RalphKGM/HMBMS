import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";
import { fullName } from "../utils/helpers";

const initialForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  birthdate: "",
  address: "",
  contactNumber: "",
  collectionProgram: "Supsup Todo",
  status: "Active",
};

function Donors({ currentUser }) {
  const [donors, setDonors] = useState([]);
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [form, setForm] = useState(initialForm);
  const [editingDonorId, setEditingDonorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const loadDonors = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${apiBase}/api/donors`);
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to load donors.");
      }

      setDonors(body.donors || []);
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load donors.");
      setDonors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonors();
  }, []);

  const filteredDonors = useMemo(() => {
    return donors.filter((donor) => {
      const text = `${donor.dtn} ${fullName({
        firstName: donor.first_name,
        middleName: donor.middle_name,
        lastName: donor.last_name,
      })} ${donor.collection_program || ""} ${donor.status}`;
      const matchesQuery = text.toLowerCase().includes(query.toLowerCase());
      const matchesProgram = programFilter === "All" || donor.collection_program === programFilter;
      const matchesStatus = statusFilter === "All" || donor.status === statusFilter;
      return matchesQuery && matchesProgram && matchesStatus;
    });
  }, [donors, query, programFilter, statusFilter]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingDonorId(null);
  };

  const openEditForm = (donor) => {
    setEditingDonorId(donor.donor_id);
    setForm({
      firstName: donor.first_name || "",
      middleName: donor.middle_name || "",
      lastName: donor.last_name || "",
      birthdate: donor.birthdate || "",
      address: donor.address || "",
      contactNumber: donor.contact_number || "",
      collectionProgram: donor.collection_program || "Supsup Todo",
      status: donor.status || "Active",
    });
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
        }
      );

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to save donor.");
      }

      setMessage(editingDonorId ? "Donor updated." : `Donor saved. Generated DTN: ${body.donor?.dtn || "N/A"}`);
      resetForm();
      await loadDonors();
    } catch (saveError) {
      setError(saveError.message || "Failed to save donor.");
    } finally {
      setSaving(false);
    }
  };

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
      await loadDonors();
    } catch (toggleError) {
      setError(toggleError.message || "Failed to update donor status.");
    }
  };

  const removeDonor = async (donorId) => {
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/api/donors/${donorId}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to remove donor.");
      }

      setMessage("Donor removed.");
      await loadDonors();
    } catch (removeError) {
      setError(removeError.message || "Failed to remove donor.");
    }
  };

  if (loading) {
    return <p>Loading donors...</p>;
  }

  return (
    <section>
      <h2>Donor Management</h2>
      {error && <p className="message">{error}</p>}
      {message && <p className="message">{message}</p>}
      <form onSubmit={saveDonor}>
        <label>
          First Name{" "}
          <input
            required
            value={form.firstName}
            onChange={(event) => setForm({ ...form, firstName: event.target.value })}
          />
        </label>
        <label>
          Middle Name{" "}
          <input
            value={form.middleName}
            onChange={(event) => setForm({ ...form, middleName: event.target.value })}
          />
        </label>
        <label>
          Last Name{" "}
          <input
            required
            value={form.lastName}
            onChange={(event) => setForm({ ...form, lastName: event.target.value })}
          />
        </label>
        <label>
          Birthdate{" "}
          <input
            required
            type="date"
            value={form.birthdate}
            onChange={(event) => setForm({ ...form, birthdate: event.target.value })}
          />
        </label>
        <label>
          Contact Number{" "}
          <input
            required
            value={form.contactNumber}
            onChange={(event) => setForm({ ...form, contactNumber: event.target.value })}
          />
        </label>
        <label>
          Address{" "}
          <textarea
            required
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
          />
        </label>
        <label>
          Collection Program
          <select
            value={form.collectionProgram}
            onChange={(event) => setForm({ ...form, collectionProgram: event.target.value })}
          >
            <option value="Supsup Todo">Supsup Todo</option>
            <option value="Mom's Act">Mom's Act</option>
            <option value="Milky Way">Milky Way</option>
          </select>
        </label>
        <label>
          Status
          <select
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value })}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : editingDonorId ? "Update Donor" : "Save Donor"}
        </button>
        {editingDonorId && (
          <button type="button" onClick={resetForm}>
            Cancel Edit
          </button>
        )}
      </form>

      <h3>Donor List</h3>
      <label>
        Search{" "}
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <label>
        Program Filter{" "}
        <select value={programFilter} onChange={(event) => setProgramFilter(event.target.value)}>
          <option value="All">All</option>
          <option value="Supsup Todo">Supsup Todo</option>
          <option value="Mom's Act">Mom's Act</option>
          <option value="Milky Way">Milky Way</option>
        </select>
      </label>
      <label>
        Status Filter{" "}
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </label>
      <Table
        headers={["DTN", "Name", "Program", "Contact", "Status", "Actions"]}
        rows={filteredDonors.map((donor) => [
          donor.dtn,
          fullName({
            firstName: donor.first_name,
            middleName: donor.middle_name,
            lastName: donor.last_name,
          }),
          donor.collection_program,
          donor.contact_number,
          donor.status,
          <span key={donor.donor_id}>
            <button
              type="button"
              onClick={() => toggleDonor(donor.donor_id, donor.status)}
            >
              {donor.status === "Active" ? "Deactivate" : "Activate"}
            </button>
            {" "}
            <button type="button" onClick={() => openEditForm(donor)}>
              Edit
            </button>
            {" "}
            <button type="button" onClick={() => removeDonor(donor.donor_id)}>
              Remove
            </button>
          </span>,
        ])}
      />
    </section>
  );
}

export default Donors;
