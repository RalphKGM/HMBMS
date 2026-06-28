import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";
import { fullName, today } from "../utils/helpers";

const initialForm = {
  donorId: "",
  collectionType: "Supsup Todo",
  collectionDate: today(),
  volumeMl: "",
};

const initialPoolForm = {
  collectionType: "Supsup Todo",
  collectionDate: today(),
  donorId: "",
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

async function fetchUsers(apiBase) {
  const response = await fetch(`${apiBase}/api/users`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load users.");
  }

  return body.users || [];
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
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [collections, setCollections] = useState([]);
  const [query, setQuery] = useState("");
  const [singleForm, setSingleForm] = useState(initialForm);
  const [poolForm, setPoolForm] = useState(initialPoolForm);
  const [isPooledMode, setIsPooledMode] = useState(false);
  const [selectedPoolBatchId, setSelectedPoolBatchId] = useState("");
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

    Promise.all([fetchDonors(apiBase), fetchUsers(apiBase), fetchMilkRecords(apiBase)])
      .then(([donorRecords, userRecords, milkRecords]) => {
        if (!isMounted) return;
        setDonors(donorRecords);
        setUsers(userRecords);
        setBatches(milkRecords.batches);
        setCollections(milkRecords.collections);
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load milk records.");
        setDonors([]);
        setUsers([]);
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

  const userNames = useMemo(() => {
    return users.reduce((names, user) => {
      names[user.user_id] = fullName({
        firstName: user.first_name,
        lastName: user.last_name,
      }) || user.username;
      return names;
    }, {});
  }, [users]);

  const collectionsByBatch = useMemo(() => {
    return collections.reduce((groups, collection) => {
      if (!groups[collection.batch_id]) {
        groups[collection.batch_id] = [];
      }
      groups[collection.batch_id].push(collection);
      return groups;
    }, {});
  }, [collections]);

  const batchContributors = useMemo(() => {
    if (!selectedPoolBatchId) return [];
    return (collectionsByBatch[selectedPoolBatchId] || []).slice().sort((left, right) => {
      return left.collection_id - right.collection_id;
    });
  }, [collectionsByBatch, selectedPoolBatchId]);

  const pooledBatches = useMemo(() => batches.filter((batch) => batch.is_pooled), [batches]);

  const filteredCollections = useMemo(() => {
    return collections.filter((collection) => {
      const text = `${donorNames[collection.donor_id]} ${collection.collection_type} ${collection.status}`;
      return text.toLowerCase().includes(query.toLowerCase());
    });
  }, [collections, donorNames, query]);

  const selectedBatch = useMemo(
    () => batches.find((batch) => String(batch.batch_id) === String(selectedPoolBatchId)) || null,
    [batches, selectedPoolBatchId],
  );

  const selectedBatchSummary = useMemo(() => {
    if (!selectedBatch) return null;
    return {
      collectionDate: batchContributors[0]?.collection_date || selectedBatch.created_at?.slice(0, 10) || "Not set",
      collectionType: batchContributors[0]?.collection_type || poolForm.collectionType,
      collectedBy: batchContributors[0]
        ? userNames[batchContributors[0].collected_by] || "Unknown"
        : "Unknown",
      totalVolume: Number(selectedBatch.total_volume || 0),
      status: selectedBatch.status,
    };
  }, [batchContributors, poolForm.collectionType, selectedBatch, userNames]);

  const resetSingleForm = () => {
    setSingleForm(initialForm);
  };

  const resetPoolForm = () => {
    setPoolForm(initialPoolForm);
  };

  const saveSingleCollection = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/api/milk-records/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...singleForm,
          collectedBy: currentUser?.id ?? currentUser?.user_id ?? null,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to save collection.");
      }

      setMessage(`Milk collection saved under ${body.batch?.batch_number || "new batch"}.`);
      resetSingleForm();
      await loadMilkRecords();
    } catch (saveError) {
      setError(saveError.message || "Failed to save collection.");
    } finally {
      setSaving(false);
    }
  };

  const createPooledBatch = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/api/milk-records/pools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionType: poolForm.collectionType,
          collectionDate: poolForm.collectionDate,
          collectedBy: currentUser?.id ?? currentUser?.user_id ?? null,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to create pooled batch.");
      }

      setSelectedPoolBatchId(String(body.batch.batch_id));
      setMessage(`Pooled batch ${body.batch.batch_number} created.`);
      resetPoolForm();
      await loadMilkRecords();
    } catch (createError) {
      setError(createError.message || "Failed to create pooled batch.");
    } finally {
      setSaving(false);
    }
  };

  const addContributorToBatch = async () => {
    if (!selectedPoolBatchId) {
      setError("Select a pooled batch first.");
      return;
    }

    if (!poolForm.donorId || !poolForm.volumeMl) {
      setError("Select a donor and enter a volume.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${apiBase}/api/milk-records/pools/${selectedPoolBatchId}/contributions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            donorId: poolForm.donorId,
            volumeMl: poolForm.volumeMl,
            collectionType: poolForm.collectionType,
            collectionDate: poolForm.collectionDate,
            collectedBy: currentUser?.id ?? currentUser?.user_id ?? null,
          }),
        },
      );
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to add donor contribution.");
      }

      setMessage(`Added contribution to ${body.batch?.batch_number || "selected batch"}.`);
      setPoolForm((current) => ({
        ...current,
        donorId: "",
        volumeMl: "",
      }));
      await loadMilkRecords();
    } catch (addError) {
      setError(addError.message || "Failed to add donor contribution.");
    } finally {
      setSaving(false);
    }
  };

  const pooledCollectionRows = useMemo(() => {
    return filteredCollections.map((collection) => {
      const batchEntries = (collectionsByBatch[collection.batch_id] || []).slice().sort(
        (left, right) => left.collection_id - right.collection_id,
      );
      const entryNumber = batchEntries.findIndex((item) => item.collection_id === collection.collection_id) + 1;

      return [
        batches.find((batch) => batch.batch_id === collection.batch_id)?.batch_number ||
          `Batch #${collection.batch_id}`,
        entryNumber > 0 ? entryNumber : 1,
        donorOptions.find((donor) => donor.donor_id === collection.donor_id)?.dtn ||
          "Unknown",
        donorNames[collection.donor_id] || "Unknown",
        `${collection.volume_ml} mL`,
        collection.collection_type,
        collection.collection_date,
        userNames[collection.collected_by] || "Unknown",
        collection.status,
      ];
    });
  }, [batches, collectionsByBatch, donorNames, donorOptions, filteredCollections, userNames]);

  if (loading) {
    return <p>Loading milk records...</p>;
  }

  return (
    <section>
      <h2>Milk Records</h2>
      {error && <p className="message">{error}</p>}
      {message && <p className="message">{message}</p>}

      <label>
        <input
          type="checkbox"
          checked={isPooledMode}
          onChange={(event) => setIsPooledMode(event.target.checked)}
        />{" "}
        Create Pooled Batch
      </label>

      {!isPooledMode ? (
        <form onSubmit={saveSingleCollection}>
          <label>
            Donor
            <select
              required
              value={singleForm.donorId}
              onChange={(event) => setSingleForm({ ...singleForm, donorId: event.target.value })}
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
              value={singleForm.collectionType}
              onChange={(event) =>
                setSingleForm({ ...singleForm, collectionType: event.target.value })
              }
            >
              <option value="Supsup Todo">Supsup Todo</option>
              <option value="Milky Way">Milky Way</option>
              <option value="Mom's Act">Mom's Act</option>
            </select>
          </label>
          <label>
            Collection Date{" "}
            <input
              required
              type="date"
              value={singleForm.collectionDate}
              onChange={(event) =>
                setSingleForm({ ...singleForm, collectionDate: event.target.value })
              }
            />
          </label>
          <label>
            Volume (mL){" "}
            <input
              required
              min="30"
              max="240"
              type="number"
              value={singleForm.volumeMl}
              onChange={(event) => setSingleForm({ ...singleForm, volumeMl: event.target.value })}
            />
          </label>
          <p>Each donation session must be between 30 mL and 240 mL.</p>
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Collection"}
          </button>
        </form>
      ) : (
        <section>
          <h3>Create Pooled Batch</h3>
          <label>
            Collection Type
            <select
              value={poolForm.collectionType}
              onChange={(event) => setPoolForm({ ...poolForm, collectionType: event.target.value })}
            >
              <option value="Supsup Todo">Supsup Todo</option>
              <option value="Milky Way">Milky Way</option>
              <option value="Mom's Act">Mom's Act</option>
            </select>
          </label>
          <label>
            Collection Date{" "}
            <input
              required
              type="date"
              value={poolForm.collectionDate}
              onChange={(event) => setPoolForm({ ...poolForm, collectionDate: event.target.value })}
              disabled={Boolean(selectedPoolBatchId && batchContributors[0]?.collection_date)}
            />
          </label>
          {selectedPoolBatchId && batchContributors[0]?.collection_date && (
            <p>Collection date is locked to {batchContributors[0].collection_date} for this batch.</p>
          )}
          <button type="button" onClick={createPooledBatch} disabled={saving}>
            {saving ? "Creating..." : "Create Pooled Batch"}
          </button>

          <h3>Add Contributor to Batch</h3>
          <label>
            Pooled Batch
            <select
              value={selectedPoolBatchId}
              onChange={(event) => {
                setSelectedPoolBatchId(event.target.value);
                const nextBatch = batches.find((batch) => String(batch.batch_id) === event.target.value);
                const nextDate = nextBatch
                  ? (collectionsByBatch[nextBatch.batch_id]?.[0]?.collection_date || poolForm.collectionDate)
                  : poolForm.collectionDate;
                setPoolForm((current) => ({
                  ...current,
                  collectionDate: nextDate,
                }));
              }}
            >
              <option value="">Select pooled batch</option>
              {pooledBatches.map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_number} - {batch.total_volume} mL
                </option>
              ))}
            </select>
          </label>
          <label>
            Donor
            <select
              value={poolForm.donorId}
              onChange={(event) => setPoolForm({ ...poolForm, donorId: event.target.value })}
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
            Volume (mL){" "}
            <input
              required
              min="30"
              max="240"
              type="number"
              value={poolForm.volumeMl}
              onChange={(event) => setPoolForm({ ...poolForm, volumeMl: event.target.value })}
            />
          </label>
          <p>Each contribution must be between 30 mL and 240 mL.</p>
          <button type="button" onClick={addContributorToBatch} disabled={saving}>
            {saving ? "Saving..." : "Add to Batch"}
          </button>
        </section>
      )}

      <h3>Collection Records</h3>
      <label>
        Search{" "}
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <Table
        headers={[
          "Batch Number",
          "Entry Number",
          "Donor DTN",
          "Donor Name",
          "Volume",
          "Collection Type",
          "Collection Date",
          "Collected By",
          "Status",
        ]}
        rows={pooledCollectionRows}
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

      {selectedBatch && (
        <div>
          <h3>Pooling Summary - {selectedBatch.batch_number}</h3>
          <button type="button" onClick={() => setSelectedPoolBatchId("")}>
            Close
          </button>
          {selectedBatchSummary && (
            <>
              <p>Collection Date: {selectedBatchSummary.collectionDate}</p>
              <p>Collection Type: {selectedBatchSummary.collectionType}</p>
              <p>Collected By: {selectedBatchSummary.collectedBy}</p>
              <Table
                headers={["Donor Name", "DTN", "Volume"]}
                rows={batchContributors.map((collection) => [
                  donorNames[collection.donor_id] || "Unknown",
                  donorOptions.find((donor) => donor.donor_id === collection.donor_id)?.dtn ||
                    "Unknown",
                  `${collection.volume_ml} mL`,
                ])}
              />
              <p>Total Volume: {selectedBatchSummary.totalVolume} mL</p>
              <p>Status: {selectedBatchSummary.status}</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default MilkRecords;
