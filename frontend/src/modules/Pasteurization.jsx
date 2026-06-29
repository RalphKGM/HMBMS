import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";
import { resultPillClass, statusPillClass, today } from "../utils/helpers";

const resultOptions = ["Passed", "Failed"];
const pendingPostTestStatuses = ["Pending Post-Test", "Passed"];

const initialForm = {
  preTestResult: "",
  preTestDate: today(),
  postTestResult: "",
  postTestDate: today(),
  expirationDate: "",
};

async function fetchPasteurizationData(apiBase) {
  const response = await fetch(`${apiBase}/api/pasteurization`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load pasteurization data.");
  }

  return {
    batches: body.batches || [],
    records: body.records || [],
  };
}

function Pasteurization({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [queueSearch, setQueueSearch] = useState("");
  const [queueStatusFilter, setQueueStatusFilter] = useState("All");
  const [recordSearch, setRecordSearch] = useState("");
  const [recordResultFilter, setRecordResultFilter] = useState("All");
  const [form, setForm] = useState(initialForm);
  const [data, setData] = useState({
    batches: [],
    records: [],
  });

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

  useEffect(() => {
    let mounted = true;

    fetchPasteurizationData(apiBase)
      .then((body) => {
        if (!mounted) return;
        setData({
          batches: body.batches || [],
          records: body.records || [],
        });
      })
      .catch((fetchError) => {
        if (!mounted) return;
        setError(fetchError.message || "Failed to load pasteurization data.");
        setData({ batches: [], records: [] });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [apiBase]);

  const batches = data.batches || [];
  const records = data.records || [];

  const displayBatchStatus = (status) => {
    if (status === "Passed") return "Pending Post-Test";
    return status || "Unknown";
  };

  const getPreTestDisplay = (record, batch) => {
    if (record?.pre_test_result) return record.pre_test_result;
    if (batch?.status === "Pending Lab") return "Pending Lab";
    if (pendingPostTestStatuses.includes(batch?.status)) return "Pending Post-Test";
    return batch?.status || "Pending Lab";
  };

  const getPostTestDisplay = (record, batch) => {
    if (record?.post_test_result) return record.post_test_result;
    if (record?.pre_test_result === "Failed") return "Failed";
    if (batch?.status === "Disposed") return "Skipped";
    if (pendingPostTestStatuses.includes(batch?.status)) return "Pending Post-Test";
    if (batch?.status === "Pending Lab") return "Pending Lab";
    return batch?.status || "Pending Lab";
  };

  const getDateDisplay = (date, fallback = "Not scheduled") => {
    return date || fallback;
  };

  const batchNames = useMemo(() => {
    return batches.reduce((names, batch) => {
      names[batch.batch_id] = batch.batch_number;
      return names;
    }, {});
  }, [batches]);

  const batchById = useMemo(() => {
    return batches.reduce((lookup, batch) => {
      lookup[batch.batch_id] = batch;
      return lookup;
    }, {});
  }, [batches]);

  const selectedBatch = batches.find((batch) => String(batch.batch_id) === String(selectedBatchId));
  const selectedRecord = records.find((record) => String(record.batch_id) === String(selectedBatchId));

  const workQueue = useMemo(() => {
    return records.filter((record) => {
      const batch = batchById[record.batch_id];
      return batch && !["Available", "Disposed"].includes(batch.status);
    });
  }, [batchById, records]);

  const filteredWorkQueue = useMemo(() => {
    const normalizedSearch = queueSearch.trim().toLowerCase();

    return workQueue.filter((record) => {
      const batch = batchById[record.batch_id];
      const status = displayBatchStatus(batch?.status);
      const searchableText = [
        batch?.batch_number,
        record.pre_test_date,
        record.post_test_date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesStatus = queueStatusFilter === "All" || status === queueStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [batchById, queueSearch, queueStatusFilter, workQueue]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = recordSearch.trim().toLowerCase();

    return records.filter((record) => {
      const batch = batchById[record.batch_id];
      const batchName = batchNames[record.batch_id] || "";
      const preTestDisplay = getPreTestDisplay(record, batch);
      const postTestDisplay = getPostTestDisplay(record, batch);
      const searchableText = [
        batchName,
        preTestDisplay,
        postTestDisplay,
        record.pre_test_date,
        record.post_test_date,
        record.expiration_date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesResult =
        recordResultFilter === "All" ||
        record.pre_test_result === recordResultFilter ||
        record.post_test_result === recordResultFilter;

      return matchesSearch && matchesResult;
    });
  }, [batchById, batchNames, recordResultFilter, recordSearch, records]);

  const pasteurizationStats = useMemo(
    () => [
      {
        label: "Work Queue",
        value: workQueue.length,
        note: "Batches needing review",
      },
      {
        label: "Pending Lab",
        value: batches.filter((batch) => batch.status === "Pending Lab").length,
        note: "Awaiting pre-test result",
      },
      {
        label: "Pending Post-Test",
        value: batches.filter((batch) => pendingPostTestStatuses.includes(batch.status)).length,
        note: "Ready for post-test",
      },
    ],
    [batches, workQueue.length],
  );

  const refreshData = async () => {
    const body = await fetchPasteurizationData(apiBase);
    setData({
      batches: body.batches || [],
      records: body.records || [],
    });
  };

  const resetForm = () => {
    setForm(initialForm);
  };

  const openBatch = (batchId) => {
    const batch = batches.find((item) => String(item.batch_id) === String(batchId));
    const record = records.find((item) => String(item.batch_id) === String(batchId));
    if (!batch) return;

    setSelectedBatchId(String(batchId));
    setForm({
      preTestResult: record?.pre_test_result || "",
      preTestDate: record?.pre_test_date || today(),
      postTestResult: record?.post_test_result || "",
      postTestDate: record?.post_test_date || today(),
      expirationDate: batch.expiration_date || "",
    });
    setError("");
    setMessage("");
  };

  const closeDetails = () => {
    if (saving) return;
    setSelectedBatchId("");
    resetForm();
  };

  const savePreTest = async (event) => {
    event.preventDefault();

    if (!selectedBatchId) {
      setError("Select a batch first.");
      return;
    }

    if (!form.preTestResult) {
      setError("Select a pre-test result.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/api/pasteurization/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: selectedBatchId,
          preTestResult: form.preTestResult,
          preTestDate: form.preTestDate,
          recordedBy: currentUser?.id ?? currentUser?.user_id ?? null,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to save pre-test.");
      }

      setMessage(
        form.preTestResult === "Failed"
          ? `Batch ${body.batch?.batch_number || selectedBatch?.batch_number || ""} failed pre-test and was disposed.`
          : `Batch ${body.batch?.batch_number || selectedBatch?.batch_number || ""} passed pre-test.`,
      );
      closeDetails();
      await refreshData();
    } catch (saveError) {
      setError(saveError.message || "Failed to save pre-test.");
    } finally {
      setSaving(false);
    }
  };

  const savePasteurization = async (event) => {
    event.preventDefault();

    if (!selectedBatchId) {
      setError("Select a batch first.");
      return;
    }

    if (!pendingPostTestStatuses.includes(selectedBatch?.status)) {
      setError("Select a batch that is pending pasteurization.");
      return;
    }

    if (!form.postTestResult) {
      setError("Select a post-test result.");
      return;
    }

    if (form.postTestResult === "Passed" && !form.expirationDate) {
      setError("Enter an expiration date for a batch that passed the post-test.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/api/pasteurization/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: selectedBatchId,
          preTestResult: "Passed",
          preTestDate: form.preTestDate,
          postTestResult: form.postTestResult,
          postTestDate: form.postTestDate,
          expirationDate: form.postTestResult === "Passed" ? form.expirationDate : "",
          recordedBy: currentUser?.id ?? currentUser?.user_id ?? null,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to save pasteurization.");
      }

      setMessage(
        form.postTestResult === "Failed"
          ? `Batch ${body.batch?.batch_number || selectedBatch?.batch_number || ""} failed post-test and was disposed.`
          : `Batch ${body.batch?.batch_number || selectedBatch?.batch_number || ""} is now available.`,
      );
      closeDetails();
      await refreshData();
    } catch (saveError) {
      setError(saveError.message || "Failed to save pasteurization.");
    } finally {
      setSaving(false);
    }
  };

  const handleQueueAction = (batch) => {
    if (!batch) return;
    openBatch(batch.batch_id);
  };

  if (loading) {
    return (
      <section>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p>Loading pasteurization records...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header">
          <div>
            <h2>Pasteurization</h2>
            <p className="mt-2 max-w-2xl text-sm">
              Process milk batches through pre-test review, pasteurization, and post-test release.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {pasteurizationStats.map((stat) => (
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

      {error && <p className="message">{error}</p>}
      {message && <p className="message">{message}</p>}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>Pasteurization Queue</h3>
            <p className="mt-1 text-sm">
              Open a batch to record its next required test result.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {filteredWorkQueue.length} of {workQueue.length} {workQueue.length === 1 ? "batch" : "batches"}
          </span>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <label>
            Search Queue
            <input
              value={queueSearch}
              onChange={(event) => setQueueSearch(event.target.value)}
              placeholder="Search batch number or date"
            />
          </label>
          <label>
            Status
            <select
              value={queueStatusFilter}
              onChange={(event) => setQueueStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Pending Lab">Pending Lab</option>
              <option value="Pending Post-Test">Pending Post-Test</option>
            </select>
          </label>
        </div>
        <Table
          headers={["Batch Number", "Status", "Last Test", "Next Step", "Action"]}
          rows={filteredWorkQueue.map((record) => {
            const batch = batchById[record.batch_id];
            const status = displayBatchStatus(batch?.status);
            const nextStep =
              batch?.status === "Pending Lab"
                ? "Review pre-test"
                : pendingPostTestStatuses.includes(batch?.status)
                  ? "Complete post-test"
                  : "View batch";
            const lastTest = record.post_test_result
              ? `${record.post_test_result} (${record.post_test_date || "No date"})`
              : record.pre_test_result
                ? `${record.pre_test_result} (${record.pre_test_date || "No date"})`
                : "Pending Lab";

            return [
              <span key={`batch-${record.pasteurization_id}`} className="font-semibold text-slate-900">
                {batch?.batch_number || batchNames[record.batch_id] || "Unknown"}
              </span>,
              <span
                key={`stage-${record.pasteurization_id}`}
                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusPillClass(batch?.status)}`}
              >
                {status}
              </span>,
              lastTest,
              nextStep,
              <button
                key={`process-${record.pasteurization_id}`}
                type="button"
                className="min-h-0 border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:border-blue-300 hover:bg-blue-100"
                onClick={() => handleQueueAction(batch)}
              >
                Process Batch
              </button>,
            ];
          })}
        />
      </div>

      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="section-header mb-4">
              <div>
                <h3>Process Batch - {selectedBatch.batch_number}</h3>
                <p className="mt-1 text-sm">
                  Record the required result for the current pasteurization status.
                </p>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-full border-slate-200 bg-slate-50 p-0 text-lg text-slate-600 hover:bg-slate-100"
                onClick={closeDetails}
                aria-label="Close pasteurization modal"
              >
                X
              </button>
            </div>

            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <p>Current Status: {displayBatchStatus(selectedBatch.status)}</p>
              <p>Total Volume: {selectedBatch.total_volume || 0} mL</p>
              <p>Available Volume: {selectedBatch.available_volume || 0} mL</p>
              <p>Expiration: {selectedBatch.expiration_date || "Not set"}</p>
              <p>Pre-test: {getPreTestDisplay(selectedRecord, selectedBatch)}</p>
              <p>Post-test: {getPostTestDisplay(selectedRecord, selectedBatch)}</p>
            </div>

            {selectedBatch.status === "Pending Lab" && (
              <form className="mt-5" onSubmit={savePreTest}>
                <p className="text-sm sm:col-span-2 xl:col-span-3">
                  If the batch fails pre-test, it will be disposed and will not proceed to post-test.
                </p>
                <label>
                  Pre-Test Date
                  <input
                    type="date"
                    value={form.preTestDate}
                    onChange={(event) => setForm({ ...form, preTestDate: event.target.value })}
                  />
                </label>
                <label>
                  Pre-Test Result
                  <select
                    required
                    value={form.preTestResult}
                    onChange={(event) => setForm({ ...form, preTestResult: event.target.value })}
                  >
                    <option value="">Select</option>
                    {resultOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap justify-end gap-3 sm:col-span-2 xl:col-span-3">
                  <button type="button" onClick={closeDetails} disabled={saving}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Pre-Test"}
                  </button>
                </div>
              </form>
            )}

            {pendingPostTestStatuses.includes(selectedBatch.status) && (
              <form className="mt-5" onSubmit={savePasteurization}>
                <p className="text-sm sm:col-span-2 xl:col-span-3">
                  Complete post-test and record whether the batch can be released.
                </p>
                <label>
                  Pasteurization Date
                  <input
                    type="date"
                    value={form.postTestDate}
                    onChange={(event) => setForm({ ...form, postTestDate: event.target.value })}
                  />
                </label>
                <label>
                  Post-Test Result
                  <select
                    required
                    value={form.postTestResult}
                    onChange={(event) => setForm({ ...form, postTestResult: event.target.value })}
                  >
                    <option value="">Select</option>
                    {resultOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                {form.postTestResult === "Passed" && (
                  <label>
                    Expiration Date
                    <input
                      type="date"
                      required
                      value={form.expirationDate}
                      onChange={(event) => setForm({ ...form, expirationDate: event.target.value })}
                    />
                  </label>
                )}
                <div className="flex flex-wrap justify-end gap-3 sm:col-span-2 xl:col-span-3">
                  <button type="button" onClick={closeDetails} disabled={saving}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="border-blue-600 bg-blue-600 text-white hover:border-blue-700 hover:bg-blue-700"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Pasteurization"}
                  </button>
                </div>
              </form>
            )}

            {!["Pending Lab", ...pendingPostTestStatuses].includes(selectedBatch.status) && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p>This batch has no pending pasteurization action.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>Test Records</h3>
            <p className="mt-1 text-sm">
              Historical pre-test and post-test results for generated batches.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {filteredRecords.length} of {records.length} {records.length === 1 ? "record" : "records"}
          </span>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <label>
            Search Records
            <input
              value={recordSearch}
              onChange={(event) => setRecordSearch(event.target.value)}
              placeholder="Search batch number, date, or expiration"
            />
          </label>
          <label>
            Result
            <select
              value={recordResultFilter}
              onChange={(event) => setRecordResultFilter(event.target.value)}
            >
              <option value="All">All results</option>
              <option value="Passed">Passed</option>
              <option value="Failed">Failed</option>
            </select>
          </label>
        </div>
        <Table
          headers={["Batch", "Pre-test", "Pre-test Date", "Post-test", "Post-test Date", "Expiration"]}
          rows={filteredRecords.map((record) => {
            const batch = batchById[record.batch_id];
            const preTestDisplay = getPreTestDisplay(record, batch);
            const postTestDisplay = getPostTestDisplay(record, batch);

            return [
              <span key={`record-batch-${record.pasteurization_id}`} className="font-semibold text-slate-900">
                {batchNames[record.batch_id] || "Unknown"}
              </span>,
              <span
                key={`pre-${record.pasteurization_id}`}
                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${resultPillClass(preTestDisplay)}`}
              >
                {preTestDisplay}
              </span>,
              getDateDisplay(record.pre_test_date),
              <span
                key={`post-${record.pasteurization_id}`}
                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${resultPillClass(postTestDisplay)}`}
              >
                {postTestDisplay}
              </span>,
              getDateDisplay(record.post_test_date),
              record.expiration_date || "Not set",
            ];
          })}
        />
      </div>
    </section>
  );
}

export default Pasteurization;
