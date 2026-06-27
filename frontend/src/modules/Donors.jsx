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
};

async function fetchDonors(apiBase) {
  const response = await fetch(`${apiBase}/api/donors`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load donors.");
  }

  return body.donors || [];
}

function Donors({ currentUser }) {
  const [donors, setDonors] = useState([]);
  const [query, setQuery] = useState("");
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
      const text = `${donor.dtn} ${fullName(donor)} ${donor.status}`;
      return text.toLowerCase().includes(query.toLowerCase());
    });
  }, [donors, query]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingDonorId(null);
  }

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
      await loadDonors();
    } catch (toggleError) {
      setError(toggleError.message || "Failed to update donor status.");
    }
  }

  const startEdit = (donor) => {
    setEditingDonorId(donor.donor_id);
    setForm({
      firstName: donor.first_name || "",
      middleName: donor.middle_name || "",
      lastName: donor.last_name || "",
      birthdate: donor.birthdate || "",
      address: donor.address || "",
      contactNumber: donor.contact_number || "",
    });
    setMessage("");
    setError("");
  };

  if (loading) {
    return <p>Loading donors...</p>;
  }

  return (
    <section>
      <h2>Donor Management</h2>
      {error && <p className="message">{error}</p>}
      {message && <p className="message">{message}</p>}
      {editingDonorId && (
        <p className="message">Editing donor profile. Save to update the existing record.</p>
      )}
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
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Donor"}
        </button>
      </form>

      <h3>Donor List</h3>
      <label>
        Search{" "}
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <Table
        headers={["DTN", "Name", "Contact", "Status", "Actions"]}
        rows={filteredDonors.map((donor) => [
          donor.dtn,
          fullName({
            firstName: donor.first_name,
            middleName: donor.middle_name,
            lastName: donor.last_name,
          }),
          donor.contact_number,
          donor.status,
          <span key={donor.donor_id}>
            <button type="button" onClick={() => startEdit(donor)}>
              Edit
            </button>{" "}
            <button
              onClick={() => toggleDonor(donor.donor_id, donor.status)}
              type="button"
            >
              {donor.status === "Active" ? "Deactivate" : "Activate"}
            </button>
          </span>,
        ])}
      />
    </section>
  );
}

export default Donors;
