import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";
import { today, daysUntil } from "../utils/helpers";

const resultOptions = ["Passed", "Failed"];

const initialForm = {
  preTestResult: "",
  preTestDate: today(),
  postTestResult: "",
  postTestDate: today(),
  expirationDate: "",
  remarks: "",
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

  const batchesById = useMemo(() => {
    return batches.reduce((byId, batch) => {
      byId[batch.batch_id] = batch;
      return byId;
    }, {});
  }, [batches]);

  const selectedBatch = batches.find((batch) => String(batch.batch_id) === String(selectedBatchId));
  const selectedRecord = records.find((record) => String(record.batch_id) === String(selectedBatchId));

  const latestRecordByBatch = useMemo(() => {
    const map = {};
    // records are ordered newest-first by the backend, so the first one
    // encountered per batch_id is automatically the latest one.
    records.forEach((record) => {
      if (!(record.batch_id in map)) {
        map[record.batch_id] = record;
      }
    });
    return map;
  }, [records]);

  const workQueue = useMemo(() => {
    return batches.filter((batch) => !["Available", "Disposed"].includes(batch.status));
  }, [batches]);

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
    if (!batch) return;

    const existingRecord = records.find((record) => String(record.batch_id) === String(batchId));

    setSelectedBatchId(String(batchId));
    setForm((current) => ({
      ...current,
      preTestDate: existingRecord?.pre_test_date || today(),
      postTestDate: today(),
      expirationDate: batch.expiration_date || "",
      preTestResult: current.preTestResult || "",
    }));
    setError("");
    setMessage("");
  };

  const closeDetails = () => {
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

    if (selectedBatch?.status !== "Passed") {
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

  const disposeFailedBatch = async (batch) => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/api/pasteurization/batches/${batch.batch_id}/dispose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Failed post-test",
          disposedBy: currentUser?.id ?? currentUser?.user_id ?? null,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to dispose batch.");
      }

      setMessage(`Batch ${batch.batch_number} moved to Disposed.`);
      await refreshData();
    } catch (saveError) {
      setError(saveError.message || "Failed to dispose batch.");
    } finally {
      setSaving(false);
    }
  };

  const handleQueueAction = (batch, action) => {
    openBatch(batch.batch_id);

    if (action === "fail-pre") {
      setForm((current) => ({
        ...current,
        preTestResult: "Failed",
      }));
      return;
    }

    if (action === "pre-test") {
      setForm((current) => ({
        ...current,
        preTestResult: current.preTestResult || "",
      }));
      return;
    }

    if (action === "pasteurize") {
      setForm((current) => ({
        ...current,
        postTestResult: current.postTestResult || "",
        postTestDate: today(),
        expirationDate: batch.expiration_date || "",
      }));
    }
  };

  const expirationStatus = (expirationDate) => {
    if (!expirationDate) return null;
    const diff = daysUntil(expirationDate);
    if (diff < 0) return "expired";
    if (diff <= 2) return "expiring";
    return "ok";
  };

  const expirationBadgeStyles = {
    expired: { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" },
    expiring: { background: "#fef3c7", color: "#b45309", border: "1px solid #fcd34d" },
    ok: { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" },
  };

  const badgeBaseStyle = {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: "999px",
    fontSize: "0.8rem",
    fontWeight: 600,
  };

  const renderExpiration = (expirationDate) => {
    if (!expirationDate) return "Not set";

    const status = expirationStatus(expirationDate);
    const labelByStatus = {
      expired: `${expirationDate} · Expired`,
      expiring: `${expirationDate} · Expiring soon`,
      ok: expirationDate,
    };

    return (
      <span style={{ ...badgeBaseStyle, ...expirationBadgeStyles[status] }}>
        {labelByStatus[status]}
      </span>
    );
  };

  const displayStatus = (batch) => {
    if (!batch) return "Unknown";
    if (batch.status === "Available" && expirationStatus(batch.expiration_date) === "expired") {
      return "Expired";
    }
    return batch.status || "Unknown";
  };

  if (loading) {
    return <p>Loading pasteurization records...</p>;
  }

  return (
    <section>
      <h2>Pasteurization</h2>
      <p>Pasteurization records are created automatically when a Milk Record is saved.</p>
      {error && <p className="message">{error}</p>}
      {message && <p className="message">{message}</p>}

      <Table
        headers={["Batch Number", "Stage", "Last Test", "Expiration", "Next Step", "Action"]}
        rows={workQueue.map((batch) => {
          const record = latestRecordByBatch[batch.batch_id];
          const nextStep =
            batch.status === "Pending Lab"
              ? "Review pre-test"
              : batch.status === "Passed"
                ? "Complete pasteurization"
                : batch.status === "Failed"
                  ? "Dispose batch"
                  : "View batch";

          return [
            batch.batch_number,
            batch.status || "Unknown",
            record?.post_test_result
              ? `${record.post_test_result} (${record.post_test_date || "No date"})`
              : record?.pre_test_result
                ? `${record.pre_test_result} (${record.pre_test_date || "No date"})`
                : "Not recorded",
            batch.expiration_date ? renderExpiration(batch.expiration_date) : "Not set",
            nextStep,
            <span key={batch.batch_id}>
              <button type="button" onClick={() => handleQueueAction(batch, "info")}>
                Process Batch
              </button>{" "}
              {batch.status === "Failed" && (
                <button type="button" onClick={() => disposeFailedBatch(batch)} disabled={saving}>
                  Dispose Now
                </button>
              )}
            </span>,
          ];
        })}
      />

      {selectedBatch && (
        <div>
          <h3>Batch Workflow - {selectedBatch.batch_number}</h3>
          <p>Current stage: {selectedBatch.status}</p>
          <p>Pre-test result: {selectedRecord?.pre_test_result || "Not recorded yet"}</p>
          <p>Post-test result: {selectedRecord?.post_test_result || "Not recorded yet"}</p>
          <p>
            Expiration date:{" "}
            {selectedBatch.expiration_date ? renderExpiration(selectedBatch.expiration_date) : "Not set"}
          </p>

          {selectedBatch.status === "Pending Lab" && (
            <form onSubmit={savePreTest}>
              <p>Select whether this batch passed or failed the pre-test.</p>
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
              <label>
                Remarks
                <textarea
                  placeholder="Optional notes for the batch"
                  value={form.remarks}
                  onChange={(event) => setForm({ ...form, remarks: event.target.value })}
                />
              </label>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Pre-Test"}
              </button>
            </form>
          )}

          {selectedBatch.status === "Passed" && (
            <form onSubmit={savePasteurization}>
              <p>Complete the pasteurization step and set the final result.</p>
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
              {form.postTestResult === "Passed" && form.expirationDate && (
                <p>
                  {renderExpiration(form.expirationDate)}
                </p>
              )}
              <label>
                Remarks
                <textarea
                  placeholder="Optional notes for the batch"
                  value={form.remarks}
                  onChange={(event) => setForm({ ...form, remarks: event.target.value })}
                />
              </label>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Pasteurization"}
              </button>
            </form>
          )}

          {selectedBatch.status === "Pending Lab" && (
            <div>
              <h4>Quick Actions</h4>
              <button
                type="button"
                onClick={() => {
                  setForm((current) => ({ ...current, preTestResult: "Passed" }));
                }}
              >
                Mark Pre-Test Passed
              </button>{" "}
              <button
                type="button"
                onClick={() => {
                  setForm((current) => ({ ...current, preTestResult: "Failed" }));
                }}
              >
                Mark Pre-Test Failed
              </button>
            </div>
          )}

          <button type="button" onClick={closeDetails}>
            Close
          </button>
        </div>
      )}

      <h3>Pasteurization Records</h3>
      <Table
        headers={[
          "Batch ID",
          "Volume (mL)",
          "Pre-Test",
          "Pre-Test Date",
          "Post-Test",
          "Post-Test Date",
          "Expiration Date",
          "Status",
        ]}
        rows={Object.values(latestRecordByBatch).map((record) => {
          const batch = batchesById[record.batch_id];
          return [
            batch?.batch_number || `Batch #${record.batch_id}`,
            batch?.total_volume != null ? batch.total_volume : "Not recorded",
            record.pre_test_result || "Not recorded",
            record.pre_test_date || "Not recorded",
            record.post_test_result || "Not recorded",
            record.post_test_date || "Not recorded",
            renderExpiration(record.expiration_date || batch?.expiration_date),
            displayStatus(batch),
          ];
        })}
      />
    </section>
  );
}

export default Pasteurization;
