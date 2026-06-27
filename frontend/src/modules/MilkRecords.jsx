import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";
import { fullName, today } from "../utils/helpers";

const initialForm = {
  donorId: "",
  collectionType: "Walk-in Donation",
  collectionDate: today(),
  volumeMl: "",
};

async function fetchDonors(apiBase) {
  const response = await fetch(`${apiBase}/api/donors`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load donors.");
  }

  return body.donors || [];
}

async function fetchMilkRecords(apiBase) {
  const response = await fetch(`${apiBase}/api/milk-records`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load milk records.");
  }

  return {
    batches: body.batches || [],
    collections: body.collections || [],
  };
}

function MilkRecords({ currentUser }) {
  const [donors, setDonors] = useState([]);
  const [batches, setBatches] = useState([]);
  const [collections, setCollections] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const loadMilkRecords = async () => {
    setLoading(true);
    setError("");

    try {
      const records = await fetchMilkRecords(apiBase);
      setBatches(records.batches);
      setCollections(records.collections);
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load milk records.");
      setBatches([]);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    Promise.all([fetchDonors(apiBase), fetchMilkRecords(apiBase)])
      .then(([donorRecords, milkRecords]) => {
        if (!isMounted) return;
        setDonors(donorRecords);
        setBatches(milkRecords.batches);
        setCollections(milkRecords.collections);
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load milk records.");
        setDonors([]);
        setBatches([]);
        setCollections([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const donorOptions = donors.filter((donor) => donor.status === "Active");

  const donorNames = useMemo(() => {
    return donors.reduce((names, donor) => {
      names[donor.donor_id] = fullName({
        firstName: donor.first_name,
        middleName: donor.middle_name,
        lastName: donor.last_name,
      });
      return names;
    }, {});
  }, [donors]);

  const filteredCollections = useMemo(() => {
    return collections.filter((collection) => {
      const text = `${donorNames[collection.donor_id]} ${collection.collection_type} ${collection.status}`;
      return text.toLowerCase().includes(query.toLowerCase());
    });
  }, [collections, donorNames, query]);

  const saveCollection = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/api/milk-records/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          collectedBy: currentUser?.id ?? currentUser?.user_id ?? null,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to save collection.");
      }

      setMessage(`Milk collection saved under ${body.batch?.batch_number || "new batch"}.`);
      setForm(initialForm);
      await loadMilkRecords();
    } catch (saveError) {
      setError(saveError.message || "Failed to save collection.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading milk records...</p>;
  }

  return (
    <section>
      <h2>Milk Records</h2>
      {error && <p className="message">{error}</p>}
      {message && <p className="message">{message}</p>}

      <form onSubmit={saveCollection}>
        <label>
          Donor
          <select
            required
            value={form.donorId}
            onChange={(event) => setForm({ ...form, donorId: event.target.value })}
          >
            <option value="">Select donor</option>
            {donorOptions.map((donor) => (
              <option key={donor.donor_id} value={donor.donor_id}>
                {donor.dtn} - {donorNames[donor.donor_id]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Collection Type
          <select
            value={form.collectionType}
            onChange={(event) => setForm({ ...form, collectionType: event.target.value })}
          >
            <option value="Walk-in Donation">Walk-in Donation</option>
            <option value="Home Collection">Home Collection</option>
            <option value="Hospital Partner">Hospital Partner</option>
          </select>
        </label>
        <label>
          Collection Date{" "}
          <input
            required
            type="date"
            value={form.collectionDate}
            onChange={(event) => setForm({ ...form, collectionDate: event.target.value })}
          />
        </label>
        <label>
          Volume (mL){" "}
          <input
            required
            min="1"
            type="number"
            value={form.volumeMl}
            onChange={(event) => setForm({ ...form, volumeMl: event.target.value })}
          />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Collection"}
        </button>
      </form>

      <h3>Collection Records</h3>
      <label>
        Search{" "}
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <Table
        headers={["Donor", "Type", "Date", "Volume", "Status"]}
        rows={filteredCollections.map((collection) => [
          donorNames[collection.donor_id] || "Unknown",
          collection.collection_type,
          collection.collection_date,
          `${collection.volume_ml} mL`,
          collection.status,
        ])}
      />

      <h3>Milk Batches</h3>
      <Table
        headers={["Batch Number", "Total Volume", "Available Volume", "Status", "Expiration"]}
        rows={batches.map((batch) => [
          batch.batch_number,
          `${batch.total_volume} mL`,
          `${batch.available_volume} mL`,
          batch.status,
          batch.expiration_date || "Not set",
        ])}
      />
    </section>
  );
}

export default MilkRecords;
