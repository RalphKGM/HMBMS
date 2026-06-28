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
  const [search, setSearch] = useState("");
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

  const filteredDisposals = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return disposals.filter((disposal) => {
      const batchName = batchNames[disposal.batch_id] || `Batch #${disposal.batch_id}`;
      const searchableText = [batchName, disposal.disposal_date]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesSearch;
    });
  }, [batchNames, disposals, search]);

  const disposalStats = useMemo(
    () => [
      {
        label: "Disposal Records",
        value: disposals.length,
        note: "Automatically logged batches",
      },
      {
        label: "Filtered Results",
        value: filteredDisposals.length,
        note: "Currently shown in table",
      },
      {
        label: "Auto Disposals",
        value: disposals.filter((disposal) => disposal.reason === "Failed pre-test").length,
        note: "Failed pre-test batches",
      },
    ],
    [disposals, filteredDisposals.length],
  );

  if (loading) {
    return (
      <section>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p>Loading disposal records...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header">
          <div>
            <h2>Disposal Records</h2>
            <p className="mt-2 max-w-2xl text-sm">
              Failed batches are automatically logged here for traceability.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {disposalStats.map((stat) => (
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="section-header mb-4">
          <div>
            <h3>Disposal Log</h3>
            <p className="mt-1 text-sm">
              Search disposal records by batch number or date.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {filteredDisposals.length} of {disposals.length} {disposals.length === 1 ? "record" : "records"}
          </span>
        </div>

        <div className="mb-4 max-w-xs">
          <label>
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search batch or date"
            />
          </label>
        </div>

        <Table
          headers={["Batch", "Date", "Reason"]}
          rows={filteredDisposals.map((disposal) => [
            <span key={`batch-${disposal.disposal_id}`} className="font-semibold text-slate-900">
              {batchNames[disposal.batch_id] || `Batch #${disposal.batch_id}`}
            </span>,
            disposal.disposal_date,
            <span
              key={`reason-${disposal.disposal_id}`}
              className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
            >
              {disposal.reason}
            </span>,
          ])}
        />
      </div>
    </section>
  );
}

export default Disposal;
