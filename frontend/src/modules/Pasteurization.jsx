import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";
import { today } from "../utils/helpers";

const initialForm = {
  batchId: "",
  preTestResult: "Passed",
  preTestDate: today(),
  postTestResult: "Passed",
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
    disposals: body.disposals || [],
  };
}

function Pasteurization({ currentUser }) {
  const [batches, setBatches] = useState([]);
  const [records, setRecords] = useState([]);
  const [disposals, setDisposals] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(initialForm);
  const [disposalReason, setDisposalReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const loadPasteurizationData = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchPasteurizationData(apiBase);
      setBatches(data.batches);
      setRecords(data.records);
      setDisposals(data.disposals);
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load pasteurization data.");
      setBatches([]);
      setRecords([]);
      setDisposals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    fetchPasteurizationData(apiBase)
      .then((data) => {
        if (!isMounted) return;
        setBatches(data.batches);
        setRecords(data.records);
        setDisposals(data.disposals);
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load pasteurization data.");
        setBatches([]);
        setRecords([]);
        setDisposals([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const batchNames = useMemo(() => {
    return batches.reduce((names, batch) => {
      names[batch.batch_id] = batch.batch_number;
      return names;
    }, {});
  }, [batches]);

  const testableBatches = batches.filter((batch) =>
    ["Pending Lab", "Passed", "Failed"].includes(batch.status),
  );

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const text = `${batchNames[record.batch_id]} ${record.pre_test_result} ${record.post_test_result}`;
      return text.toLowerCase().includes(query.toLowerCase());
    });
  }, [batchNames, query, records]);

  const saveRecord = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBase}/api/pasteurization/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          recordedBy: currentUser?.id ?? currentUser?.user_id ?? null,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to save pasteurization record.");
      }

      setMessage(`Pasteurization record saved. Batch status: ${body.batch?.status || "Updated"}.`);
      setForm(initialForm);
      await loadPasteurizationData();
    } catch (saveError) {
      setError(saveError.message || "Failed to save pasteurization record.");
    } finally {
      setSaving(false);
    }
  };

  const disposeSelectedBatch = async () => {
    if (!form.batchId) {
      setError("Select a batch before disposal.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${apiBase}/api/pasteurization/batches/${form.batchId}/dispose`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: disposalReason,
            disposedBy: currentUser?.id ?? currentUser?.user_id ?? null,
          }),
        },
      );
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Failed to dispose batch.");
      }

      setMessage(`Batch ${body.batch?.batch_number || ""} marked as disposed.`);
      setDisposalReason("");
      await loadPasteurizationData();
    } catch (disposeError) {
      setError(disposeError.message || "Failed to dispose batch.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading pasteurization records...</p>;
  }

  return (
    <section>
      <h2>Pasteurization Tracking</h2>
      {error && <p className="message">{error}</p>}
      {message && <p className="message">{message}</p>}

      <form onSubmit={saveRecord}>
        <label>
          Batch
          <select
            required
            value={form.batchId}
            onChange={(event) => setForm({ ...form, batchId: event.target.value })}
          >
            <option value="">Select batch</option>
            {testableBatches.map((batch) => (
              <option key={batch.batch_id} value={batch.batch_id}>
                {batch.batch_number} - {batch.status} - {batch.total_volume} mL
              </option>
            ))}
          </select>
        </label>
        <label>
          Pre-test Result
          <select
            value={form.preTestResult}
            onChange={(event) => setForm({ ...form, preTestResult: event.target.value })}
          >
            <option value="Passed">Passed</option>
            <option value="Failed">Failed</option>
          </select>
        </label>
        <label>
          Pre-test Date{" "}
          <input
            required
            type="date"
            value={form.preTestDate}
            onChange={(event) => setForm({ ...form, preTestDate: event.target.value })}
          />
        </label>
        <label>
          Post-test Result
          <select
            value={form.postTestResult}
            onChange={(event) => setForm({ ...form, postTestResult: event.target.value })}
          >
            <option value="Passed">Passed</option>
            <option value="Failed">Failed</option>
          </select>
        </label>
        <label>
          Post-test Date{" "}
          <input
            type="date"
            value={form.postTestDate}
            onChange={(event) => setForm({ ...form, postTestDate: event.target.value })}
          />
        </label>
        <label>
          Expiration Date{" "}
          <input
            type="date"
            value={form.expirationDate}
            onChange={(event) => setForm({ ...form, expirationDate: event.target.value })}
          />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Test Record"}
        </button>
      </form>

      <h3>Disposal</h3>
      <label>
        Reason{" "}
        <textarea
          value={disposalReason}
          onChange={(event) => setDisposalReason(event.target.value)}
        />
      </label>
      <button type="button" disabled={saving} onClick={disposeSelectedBatch}>
        Dispose Selected Batch
      </button>

      <h3>Batch Status</h3>
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

      <h3>Test Records</h3>
      <label>
        Search{" "}
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <Table
        headers={["Batch", "Pre-test", "Pre-test Date", "Post-test", "Post-test Date", "Expiration"]}
        rows={filteredRecords.map((record) => [
          batchNames[record.batch_id] || "Unknown",
          record.pre_test_result,
          record.pre_test_date,
          record.post_test_result || "Not recorded",
          record.post_test_date || "Not recorded",
          record.expiration_date || "Not set",
        ])}
      />

      <h3>Disposal Records</h3>
      <Table
        headers={["Batch", "Date", "Reason"]}
        rows={disposals.map((disposal) => [
          batchNames[disposal.batch_id] || "Unknown",
          disposal.disposal_date,
          disposal.reason,
        ])}
      />
    </section>
  );
}

export default Pasteurization;
