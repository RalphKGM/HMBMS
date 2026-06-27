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
  const response = await fetch(
    `${apiBase}/api/beneficiaries/${beneficiaryId}/inquiries`,
  );
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

function Beneficiaries({ currentUser }) {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingBeneficiaryId, setEditingBeneficiaryId] = useState(null);
  const [inquiryForm, setInquiryForm] = useState(initialInquiryForm);
  const [inquirySaving, setInquirySaving] = useState(false);
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

  const resetInquiryForm = () => {
    setInquiryForm(initialInquiryForm);
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
    setSelectedBeneficiary(beneficiary);
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
      setError("Select a beneficiary for the inquiry.");
      setInquirySaving(false);
      return;
    }

    if (!Number.isFinite(requestedVolumeMl) || requestedVolumeMl <= 0) {
      setError("Requested mL must be a positive number.");
      setInquirySaving(false);
      return;
    }

    const beneficiary = beneficiaries.find((item) => item.beneficiary_id === beneficiaryId);

    try {
      await createInquiry(apiBase, beneficiaryId, {
        loggedBy: currentUser?.id ?? currentUser?.user_id ?? null,
        requestedVolumeMl,
      });

      setMessage("Milk availability inquiry logged.");
      resetInquiryForm();
      if (beneficiary) {
        await loadInquiries(beneficiary);
      }
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

      <h3>New Inquiry</h3>
      <form onSubmit={saveInquiry}>
        <label>
          Beneficiary
          <select
            required
            value={inquiryForm.beneficiaryId}
            onChange={(event) =>
              setInquiryForm({ ...inquiryForm, beneficiaryId: event.target.value })
            }
          >
            <option value="">Select beneficiary</option>
            {beneficiaries.map((beneficiary) => (
              <option key={beneficiary.beneficiary_id} value={beneficiary.beneficiary_id}>
                {fullName({
                  firstName: beneficiary.first_name,
                  lastName: beneficiary.last_name,
                })}{" "}
                - {beneficiary.contact_number}
              </option>
            ))}
          </select>
        </label>
        <label>
          Requested mL{" "}
          <input
            required
            min="1"
            type="number"
            value={inquiryForm.requestedVolumeMl}
            onChange={(event) =>
              setInquiryForm({ ...inquiryForm, requestedVolumeMl: event.target.value })
            }
          />
        </label>
        <button type="submit" disabled={inquirySaving}>
          {inquirySaving ? "Logging..." : "Log Inquiry"}
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
            <button type="button" onClick={() => startInquiry(beneficiary)}>
              Quick Select
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
      )}
    </section>
  );
}

export default Beneficiaries;
