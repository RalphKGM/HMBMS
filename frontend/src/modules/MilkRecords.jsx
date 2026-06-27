import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";
import { fullName, today } from "../utils/helpers";

const initialSingleForm = {
  donorId: "",
  collectionType: "Supsup Todo",
  collectionDate: today(),
  volumeMl: "",
};

const initialContributor = {
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
  const [isPooled, setIsPooled] = useState(false);
  const [singleForm, setSingleForm] = useState(initialSingleForm);
  const [contributors, setContributors] = useState([initialContributor]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");

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

  const filteredCollections = useMemo(() => {
    return collections.filter((collection) => {
      const text = `${donorNames[collection.donor_id]} ${collection.collection_type} ${collection.status}`;
      return text.toLowerCase().includes(query.toLowerCase());
    });
  }, [collections, donorNames, query]);

  const selectedBatch = useMemo(() => {
    return batches.find((batch) => String(batch.batch_id) === String(selectedBatchId)) || null;
  }, [batches, selectedBatchId]);

  const selectedBatchContributors = useMemo(() => {
    if (!selectedBatch) return [];
    return collectionsByBatch[selectedBatch.batch_id] || [];
  }, [collectionsByBatch, selectedBatch]);

  const totalVolume = useMemo(() => {
    if (isPooled) {
      return contributors.reduce((total, contributor) => total + Number(contributor.volumeMl || 0), 0);
    }
    return Number(singleForm.volumeMl || 0);
  }, [contributors, isPooled, singleForm.volumeMl]);

  const resetForm = () => {
    setSingleForm(initialSingleForm);
    setIsPooled(false);
    setContributors([initialContributor]);
  };

  const updateContributor = (index, field, value) => {
    setContributors((current) =>
      current.map((contributor, currentIndex) =>
        currentIndex === index ? { ...contributor, [field]: value } : contributor,
      ),
    );
  };

  const addContributor = () => {
    setContributors((current) => [...current, initialContributor]);
  };

  const removeContributor = (index) => {
    setContributors((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const saveCollection = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = isPooled
      ? {
          poolBatch: true,
          collectionType: singleForm.collectionType,
          collectionDate: singleForm.collectionDate,
          collectedBy: currentUser?.id ?? currentUser?.user_id ?? null,
          contributors: contributors,
        }
      : {
          donorId: singleForm.donorId,
          collectionType: singleForm.collectionType,
          collectionDate: singleForm.collectionDate,
          volumeMl: singleForm.volumeMl,
          collectedBy: currentUser?.id ?? currentUser?.user_id ?? null,
        };

    try {
      const response = await fetch(`${apiBase}/api/milk-records/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to save collection.");
      }

      setMessage(`Milk collection saved under ${body.batch?.batch_number || "new batch"}.`);
      resetForm();
      await loadMilkRecords();
    } catch (saveError) {
      setError(saveError.message || "Failed to save collection.");
    } finally {
      setSaving(false);
    }
  };

  const collectedByName = (collection) => userNames[collection.collected_by] || "Unknown";

  const entryRows = useMemo(() => {
    return filteredCollections.map((collection) => {
      const batchEntries = (collectionsByBatch[collection.batch_id] || []).slice().sort(
        (left, right) => left.collection_id - right.collection_id,
      );
      const entryNumber = batchEntries.findIndex((item) => item.collection_id === collection.collection_id) + 1;

      return [
        collection.batch_id,
        entryNumber > 0 ? entryNumber : 1,
        donorOptions.find((donor) => donor.donor_id === collection.donor_id)?.dtn ||
          donorNames[collection.donor_id] ||
          "Unknown",
        donorNames[collection.donor_id] || "Unknown",
        `${collection.volume_ml} mL`,
        collection.collection_type,
        collection.collection_date,
        collectedByName(collection),
        collection.status,
        <button
          key={`summary-${collection.collection_id}`}
          type="button"
          onClick={() => setSelectedBatchId(collection.batch_id)}
        >
          View Pooling Summary
        </button>,
      ];
    });
  }, [collectionsByBatch, collectedByName, donorNames, donorOptions, filteredCollections]);

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
          <input
            type="checkbox"
            checked={isPooled}
            onChange={(event) => setIsPooled(event.target.checked)}
          />{" "}
          Pool this batch
        </label>

        <label>
          Collection Type
          <select
            value={singleForm.collectionType}
            onChange={(event) => setSingleForm({ ...singleForm, collectionType: event.target.value })}
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
            onChange={(event) => setSingleForm({ ...singleForm, collectionDate: event.target.value })}
          />
        </label>

        {!isPooled ? (
          <>
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
          </>
        ) : (
          <>
            <p>Batch Number will be generated when the batch is saved.</p>
            <h3>Contributors</h3>
            {contributors.map((contributor, index) => (
              <div key={`contributor-${index}`} style={{ marginBottom: "1rem" }}>
                <label>
                  Donor
                  <select
                    required
                    value={contributor.donorId}
                    onChange={(event) => updateContributor(index, "donorId", event.target.value)}
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
                    value={contributor.volumeMl}
                    onChange={(event) => updateContributor(index, "volumeMl", event.target.value)}
                  />
                </label>
                {contributors.length > 1 && (
                  <button type="button" onClick={() => removeContributor(index)}>
                    Remove Donor
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addContributor}>
              Add Donor
            </button>
            <p>Each contribution must be between 30 mL and 240 mL.</p>
            <p>Total Volume: {totalVolume} mL</p>
          </>
        )}

        <label>
          Collected By
          <input
            readOnly
            value={currentUser?.name || [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ")}
          />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : isPooled ? "Save Pooled Batch" : "Save Collection"}
        </button>
      </form>

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
          "Action",
        ]}
        rows={entryRows.map((row) => {
          const batch = batches.find((item) => item.batch_id === row[0]);
          return [
            batch?.batch_number || `Batch #${row[0]}`,
            row[1],
            row[2],
            row[3],
            row[4],
            row[5],
            row[6],
            row[7],
            row[8],
            row[9],
          ];
        })}
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
          <button type="button" onClick={() => setSelectedBatchId("")}>
            Close
          </button>
          <p>Collection Date: {selectedBatchContributors[0]?.collection_date || "Not set"}</p>
          <p>Collection Type: {selectedBatchContributors[0]?.collection_type || "Not set"}</p>
          <p>Collected By: {selectedBatchContributors[0] ? collectedByName(selectedBatchContributors[0]) : "Unknown"}</p>
          <Table
            headers={["Donor Name", "DTN", "Volume"]}
            rows={selectedBatchContributors.map((collection) => [
              donorNames[collection.donor_id] || "Unknown",
              donorOptions.find((donor) => donor.donor_id === collection.donor_id)?.dtn || "Unknown",
              `${collection.volume_ml} mL`,
            ])}
          />
          <p>Total Volume: {selectedBatch.total_volume} mL</p>
          <p>Status: {selectedBatch.status}</p>
        </div>
      )}
    </section>
  );
}

export default MilkRecords;
