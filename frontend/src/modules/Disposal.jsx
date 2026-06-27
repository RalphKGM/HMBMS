import { useEffect, useMemo, useState } from "react";
import Table from "../components/Table";

async function fetchDisposalData(apiBase) {
  const response = await fetch(`${apiBase}/api/pasteurization`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load disposal data.");
  }

  return {
    batches: body.batches || [],
    disposals: body.disposals || [],
  };
}

function Disposal() {
  const [batches, setBatches] = useState([]);
  const [disposals, setDisposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

  useEffect(() => {
    let isMounted = true;

    fetchDisposalData(apiBase)
      .then((data) => {
        if (!isMounted) return;
        setBatches(data.batches);
        setDisposals(data.disposals);
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load disposal data.");
        setBatches([]);
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

  if (loading) {
    return <p>Loading disposal records...</p>;
  }

  return (
    <section>
      <h2>Disposal Records</h2>
      <p>Failed pre-test batches are disposed automatically and appear here.</p>
      {error && <p className="message">{error}</p>}
      <Table
        headers={["Batch", "Date", "Reason"]}
        rows={disposals.map((disposal) => [
          batchNames[disposal.batch_id] || `Batch #${disposal.batch_id}`,
          disposal.disposal_date,
          disposal.reason,
        ])}
      />
    </section>
  );
}

export default Disposal;
