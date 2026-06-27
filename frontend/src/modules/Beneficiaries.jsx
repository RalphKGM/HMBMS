import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";
import { fullName } from "../utils/helpers";

const initialForm = {
  firstName: "",
  lastName: "",
  contactNumber: "",
  address: "",
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
  const response = await fetch(
    `${apiBase}/api/beneficiaries/${beneficiaryId}/inquiries`,
  );
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load inquiries.");
  }

  return body.inquiries || [];
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
      const name = fullName({
        firstName: beneficiary.first_name,
        lastName: beneficiary.last_name,
      });
      const text = `${name} ${beneficiary.contact_number} ${beneficiary.address} ${
        beneficiary.is_active ? "Active" : "Inactive"
      }`;
      return text.toLowerCase().includes(query.toLowerCase());
    });
  }, [beneficiaries, query]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingBeneficiaryId(null);
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
          : `Beneficiary ${fullName({
              firstName: body.beneficiary?.first_name,
              lastName: body.beneficiary?.last_name,
            })} registered.`,
      );
      resetForm();
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
      await loadBeneficiaries();
    } catch (toggleError) {
      setError(toggleError.message || "Failed to update beneficiary status.");
    }
  };

  const logInquiry = async (beneficiary) => {
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${apiBase}/api/beneficiaries/${beneficiary.beneficiary_id}/inquiries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loggedBy: currentUser?.id ?? currentUser?.user_id ?? null,
          }),
        },
      );
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to log inquiry.");
      }

      setMessage("Milk availability inquiry logged.");
      if (selectedBeneficiary?.beneficiary_id === beneficiary.beneficiary_id) {
        await loadInquiries(beneficiary);
      }
    } catch (inquiryError) {
      setError(inquiryError.message || "Failed to log inquiry.");
    }
  };

  const startEdit = (beneficiary) => {
    setEditingBeneficiaryId(beneficiary.beneficiary_id);
    setForm({
      firstName: beneficiary.first_name || "",
      lastName: beneficiary.last_name || "",
      contactNumber: beneficiary.contact_number || "",
      address: beneficiary.address || "",
    });
    setMessage("");
    setError("");
  };

  if (loading) {
    return <p>Loading beneficiaries...</p>;
  }

  const selectedName = selectedBeneficiary
    ? fullName({
        firstName: selectedBeneficiary.first_name,
        lastName: selectedBeneficiary.last_name,
      })
    : "";

  return (
    <section>
      <h2>Beneficiary Management</h2>
      {error && <p className="message">{error}</p>}
      {message && <p className="message">{message}</p>}
      {editingBeneficiaryId && (
        <p className="message">
          Editing beneficiary profile. Save to update the existing record.
        </p>
      )}

      <form onSubmit={saveBeneficiary}>
        <label>
          First Name{" "}
          <input
            required
            value={form.firstName}
            onChange={(event) => setForm({ ...form, firstName: event.target.value })}
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
          {saving ? "Saving..." : "Save Beneficiary"}
        </button>
      </form>

      <h3>Beneficiary List</h3>
      <label>
        Search{" "}
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <Table
        headers={["Name", "Contact", "Address", "Status", "Actions"]}
        rows={filteredBeneficiaries.map((beneficiary) => [
          fullName({
            firstName: beneficiary.first_name,
            lastName: beneficiary.last_name,
          }),
          beneficiary.contact_number,
          beneficiary.address,
          beneficiary.is_active ? "Active" : "Inactive",
          <span key={beneficiary.beneficiary_id}>
            <button type="button" onClick={() => startEdit(beneficiary)}>
              Edit
            </button>{" "}
            <button type="button" onClick={() => toggleBeneficiary(beneficiary)}>
              {beneficiary.is_active ? "Deactivate" : "Activate"}
            </button>{" "}
            <button type="button" onClick={() => loadInquiries(beneficiary)}>
              View Inquiries
            </button>{" "}
            <button type="button" onClick={() => logInquiry(beneficiary)}>
              Log Inquiry
            </button>
          </span>,
        ])}
      />

      {selectedBeneficiary && (
        <div>
          <h3>Inquiry History - {selectedName}</h3>
          <button
            type="button"
            onClick={() => {
              setSelectedBeneficiary(null);
              setInquiries([]);
            }}
          >
            Close
          </button>
          {loadingInquiries ? (
            <p>Loading inquiries...</p>
          ) : (
            <Table
              headers={["Inquiry Date", "Status"]}
              rows={inquiries.map((inquiry) => [
                inquiry.inquiry_date,
                inquiry.status,
              ])}
            />
          )}
        </div>
      )}
    </section>
  );
}

export default Beneficiaries;
