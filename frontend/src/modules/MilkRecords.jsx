import { useEffect, useMemo, useState } from "react";
import SearchSelect from "../components/SearchSelect";
import Table from "../components/Table";
import { fullName, statusPillClass, today } from "../utils/helpers";

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
  const [selectedPoolBatchId, setSelectedPoolBatchId] = useState("");
  const [summaryBatchId, setSummaryBatchId] = useState("");
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [showPoolModal, setShowPoolModal] = useState(false);
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

  const donorSearchOptions = useMemo(
    () =>
      donorOptions.map((donor) => ({
        value: donor.donor_id,
        label: donorNames[donor.donor_id] || `Donor #${donor.donor_id}`,
        description: donor.dtn,
      })),
    [donorNames, donorOptions],
  );

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
    () => batches.find((batch) => String(batch.batch_id) === String(summaryBatchId)) || null,
    [batches, summaryBatchId],
  );

  const summaryContributors = useMemo(() => {
    if (!selectedBatch) return [];
    return (collectionsByBatch[selectedBatch.batch_id] || []).slice().sort((left, right) => {
      return left.collection_id - right.collection_id;
    });
  }, [collectionsByBatch, selectedBatch]);

  const milkRecordStats = useMemo(
    () => [
      { label: "Collection Entries", value: collections.length, note: "Recorded donor sessions" },
      { label: "Milk Batches", value: batches.length, note: "Generated batch records" },
      { label: "Pooled Batches", value: pooledBatches.length, note: "Batches with pooled milk" },
    ],
    [batches.length, collections.length, pooledBatches.length],
  );

  const selectedBatchSummary = useMemo(() => {
    if (!selectedBatch) return null;
    return {
      collectionDate: summaryContributors[0]?.collection_date || selectedBatch.created_at?.slice(0, 10) || "Not set",
      collectionType: summaryContributors[0]?.collection_type || "Not set",
      collectedBy: summaryContributors[0]
        ? userNames[summaryContributors[0].collected_by] || "Unknown"
        : "Unknown",
      totalVolume: Number(selectedBatch.total_volume || 0),
      status: selectedBatch.status,
    };
  }, [selectedBatch, summaryContributors, userNames]);

  const resetSingleForm = () => {
    setSingleForm(initialForm);
  };

  const resetPoolForm = () => {
    setPoolForm(initialPoolForm);
  };

  const closeSingleModal = () => {
    if (saving) return;
    setError("");
    resetSingleForm();
    setShowSingleModal(false);
  };

  const closePoolModal = () => {
    if (saving) return;
    setError("");
    resetPoolForm();
    setSelectedPoolBatchId("");
    setShowPoolModal(false);
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
      setShowSingleModal(false);
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
        donors.find((donor) => donor.donor_id === collection.donor_id)?.dtn ||
          "Unknown",
        donorNames[collection.donor_id] || "Unknown",
        `${collection.volume_ml} mL`,
        collection.collection_type,
        collection.collection_date,
        userNames[collection.collected_by] || "Unknown",
        <span
          key={`status-${collection.collection_id}`}
          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusPillClass(collection.status)}`}
        >
          {collection.status}
        </span>,
      ];
    });
  }, [batches, collectionsByBatch, donorNames, donors, filteredCollections, userNames]);

  const batchRows = useMemo(() => {
    return batches.map((batch) => [
      <span key={`batch-${batch.batch_id}`} className="font-semibold text-slate-900">
        {batch.batch_number}
      </span>,
      `${batch.total_volume} mL`,
      `${batch.available_volume} mL`,
      <span
        key={`status-${batch.batch_id}`}
        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusPillClass(batch.status)}`}
      >
        {batch.status}
      </span>,
      batch.expiration_date || "Not set",
      <button
        key={`summary-${batch.batch_id}`}
        type="button"
        className="min-h-0 border-slate-300 px-3 py-1.5 text-xs"
        onClick={() => setSummaryBatchId(String(batch.batch_id))}
      >
        View Summary
      </button>,
    ]);
  }, [batches]);

  if (loading) {
    return (
      <section>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p>Loading milk records...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header">
          <div>
            <h2>Milk Records</h2>
            <p className="mt-2 max-w-2xl text-sm">
              Record donor milk collections, manage pooled batches, and review batch inventory.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {milkRecordStats.map((stat) => (
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
      {error && <p className="message">{error}</p>}

      {showSingleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="section-header mb-4">
              <div>
                <h3>New Milk Collection</h3>
                <p className="mt-1 text-sm">
                  Create one batch from one donor collection session.
                </p>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-full border-slate-200 bg-slate-50 p-0 text-lg text-slate-600 hover:bg-slate-100"
                onClick={closeSingleModal}
                aria-label="Close collection modal"
              >
                X
              </button>
            </div>
            <form onSubmit={saveSingleCollection}>
              <SearchSelect
                label="Donor"
                required
                value={singleForm.donorId}
                options={donorSearchOptions}
                placeholder="Type donor name or DTN"
                onChange={(nextValue) => setSingleForm({ ...singleForm, donorId: nextValue })}
              />
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
                Collection Date
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
                Volume (mL)
                <input
                  required
                  min="30"
                  max="240"
                  type="number"
                  value={singleForm.volumeMl}
                  onChange={(event) => setSingleForm({ ...singleForm, volumeMl: event.target.value })}
                />
              </label>
              <p className="text-sm sm:col-span-2 xl:col-span-3">
                Each donation session must be between 30 mL and 240 mL.
              </p>
              <div className="flex flex-wrap justify-end gap-3 sm:col-span-2 xl:col-span-3">
                <button type="button" onClick={closeSingleModal} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="section-header mb-4">
              <div>
                <h3>Manage Pooled Batch</h3>
                <p className="mt-1 text-sm">
                  Create a pooled batch first, then add donor contributions to that batch.
                </p>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-full border-slate-200 bg-slate-50 p-0 text-lg text-slate-600 hover:bg-slate-100"
                onClick={closePoolModal}
                aria-label="Close pooled batch modal"
              >
                X
              </button>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base">Create Pooled Batch</h3>
                <div className="mt-4 grid gap-4">
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
                    Collection Date
                    <input
                      required
                      type="date"
                      value={poolForm.collectionDate}
                      onChange={(event) => setPoolForm({ ...poolForm, collectionDate: event.target.value })}
                      disabled={Boolean(selectedPoolBatchId && batchContributors[0]?.collection_date)}
                    />
                  </label>
                  {selectedPoolBatchId && batchContributors[0]?.collection_date && (
                    <p className="text-sm">
                      Collection date is locked to {batchContributors[0].collection_date} for this batch.
                    </p>
                  )}
                  <button
                    type="button"
                    className="border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700"
                    onClick={createPooledBatch}
                    disabled={saving}
                  >
                    {saving ? "Creating..." : "Create Pooled Batch"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base">Add Contributor</h3>
                <div className="mt-4 grid gap-4">
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
                  <SearchSelect
                    label="Donor"
                    value={poolForm.donorId}
                    options={donorSearchOptions}
                    placeholder="Type donor name or DTN"
                    onChange={(nextValue) => setPoolForm({ ...poolForm, donorId: nextValue })}
                  />
                  <label>
                    Volume (mL)
                    <input
                      required
                      min="30"
                      max="240"
                      type="number"
                      value={poolForm.volumeMl}
                      onChange={(event) => setPoolForm({ ...poolForm, volumeMl: event.target.value })}
                    />
                  </label>
                  <p className="text-sm">Each contribution must be between 30 mL and 240 mL.</p>
                  <button
                    type="button"
                    className="border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700"
                    onClick={addContributorToBatch}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Add to Batch"}
                  </button>
                </div>
              </div>
            </div>

            {selectedPoolBatchId && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="section-header mb-4">
                  <div>
                    <h3>Current Contributors</h3>
                    <p className="mt-1 text-sm">Contributions already linked to the selected pooled batch.</p>
                  </div>
                </div>
                <Table
                  headers={["Donor Name", "DTN", "Volume"]}
                  rows={batchContributors.map((collection) => [
                    donorNames[collection.donor_id] || "Unknown",
                    donors.find((donor) => donor.donor_id === collection.donor_id)?.dtn || "Unknown",
                    `${collection.volume_ml} mL`,
                  ])}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>Collection Records</h3>
            <p className="mt-1 text-sm">One row is shown for each donor collection entry.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
              {filteredCollections.length} {filteredCollections.length === 1 ? "record" : "records"}
            </span>
            <button
              type="button"
              className="border-blue-600 bg-blue-600 px-4 text-white hover:border-blue-700 hover:bg-blue-700"
              onClick={() => setShowSingleModal(true)}
            >
              Add Collection
            </button>
            <button type="button" onClick={() => setShowPoolModal(true)}>
              Manage Pooled Batch
            </button>
          </div>
        </div>
        <label className="mb-4">
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search donor, collection type, or status"
          />
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
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>Milk Batches</h3>
            <p className="mt-1 text-sm">Review generated batches and open pooling summaries.</p>
          </div>
        </div>
        <Table
          headers={["Batch Number", "Total Volume", "Available Volume", "Status", "Expiration", "Action"]}
          rows={batchRows}
        />
      </div>

      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="section-header mb-4">
              <div>
                <h3>Pooling Summary - {selectedBatch.batch_number}</h3>
                <p className="mt-1 text-sm">
                  Contributor information retained for traceability.
                </p>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-full border-slate-200 bg-slate-50 p-0 text-lg text-slate-600 hover:bg-slate-100"
                onClick={() => setSummaryBatchId("")}
                aria-label="Close pooling summary modal"
              >
                X
              </button>
            </div>
            {selectedBatchSummary && (
              <div className="space-y-4">
                <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                  <p>Collection Date: {selectedBatchSummary.collectionDate}</p>
                  <p>Collection Type: {selectedBatchSummary.collectionType}</p>
                  <p>Collected By: {selectedBatchSummary.collectedBy}</p>
                  <p>Status: {selectedBatchSummary.status}</p>
                  <p>Total Volume: {selectedBatchSummary.totalVolume} mL</p>
                </div>
                <Table
                  headers={["Donor Name", "DTN", "Volume"]}
                  rows={summaryContributors.map((collection) => [
                    donorNames[collection.donor_id] || "Unknown",
                    donors.find((donor) => donor.donor_id === collection.donor_id)?.dtn ||
                      "Unknown",
                    `${collection.volume_ml} mL`,
                  ])}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default MilkRecords;
