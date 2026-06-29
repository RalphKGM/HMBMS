import { useEffect, useMemo, useState } from "react";

const emptySummary = {
  availableMilk: 0,
  donorCount: 0,
  beneficiaryCount: 0,
  pendingInquiryCount: 0,
  pasteurizationCount: 0,
  availableBatches: [],
};

async function fetchDashboardSummary(apiBase) {
  const response = await fetch(`${apiBase}/api/dashboard`);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Failed to load dashboard.");
  }

  return {
    ...emptySummary,
    ...body,
  };
}

function formatDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function Dashboard({ refreshKey = 0 }) {
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiBase =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:4000" : "/api");

  useEffect(() => {
    let isMounted = true;

    fetchDashboardSummary(apiBase)
      .then((nextSummary) => {
        if (isMounted) setSummary(nextSummary);
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(fetchError.message || "Failed to load dashboard.");
        setSummary(emptySummary);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [apiBase, refreshKey]);

  const availableBatches = useMemo(() => summary.availableBatches || [], [summary.availableBatches]);
  const recentBatches = availableBatches.slice(0, 4);
  const lowStockBatches = useMemo(() => {
    return [...availableBatches]
      .sort((left, right) => Number(left.available_volume || 0) - Number(right.available_volume || 0))
      .slice(0, 2);
  }, [availableBatches]);

  if (loading) {
    return (
      <section>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p>Loading dashboard...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="section-header">
          <div>
            <h2>System Dashboard</h2>
            <p className="mt-1 max-w-2xl text-sm">
              Real-time milk bank status for {formatDateLabel()}.
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
            Live Overview
          </span>
        </div>
      </div>

      {error && (
        <p className="message border-red-200 bg-red-50 text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Milk in Stock" value={Number(summary.availableMilk).toLocaleString()} unit="mL" />
        <MetricCard label="Active Donors" value={summary.donorCount} />
        <MetricCard label="Beneficiaries" value={summary.beneficiaryCount} />
        <MetricCard label="Pasteurization in Progress" value={summary.pasteurizationCount} unit="Batches" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.82fr)_minmax(0,1.18fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3>Inventory Status</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {availableBatches.length} available batch{availableBatches.length === 1 ? "" : "es"} ready for dispensing.
          </p>
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-center text-sm font-semibold text-blue-700">
            {Number(summary.availableMilk).toLocaleString()} mL available
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3>Operational Tasks</h3>
          <p className="mt-0.5 text-sm text-slate-500">Pending work and available resources</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <TaskItem label="INQ" title="Pending Inquiries" detail={`${summary.pendingInquiryCount} request(s) waiting`} />
            <TaskItem label="PAS" title="Pasteurization" detail={`${summary.pasteurizationCount} batch(es) in process`} />
            <TaskItem label="DIS" title="Dispensing" detail={`${availableBatches.length} batch(es) available`} />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="section-header border-b border-slate-200 px-4 py-3">
            <div>
              <h3>Recent Activity</h3>
              <p className="mt-0.5 text-sm text-slate-500">Current available batch movement</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
              Current batches
            </span>
          </div>
          <div className="divide-y divide-slate-200">
            {recentBatches.length ? (
              recentBatches.map((batch) => (
                <div className="grid gap-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center" key={batch.batch_id}>
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-green-100 text-xs font-bold text-green-700">
                    OK
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">
                      {batch.batch_number}: {Number(batch.available_volume || 0).toLocaleString()} mL available
                    </p>
                    <p className="text-sm text-slate-500">Expiration: {batch.expiration_date || "Not set"}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700">
                    {batch.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="px-4 py-4 text-slate-500">No available batch activity yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3>Low Stock Alerts</h3>
          <p className="mt-0.5 text-sm text-slate-500">Batches with the lowest available volume</p>
          <div className="mt-4 space-y-3">
            {lowStockBatches.length ? (
              lowStockBatches.map((batch) => {
                const available = Number(batch.available_volume || 0);
                const total = Math.max(Number(batch.total_volume || available || 1), 1);
                const percent = Math.min(100, Math.round((available / total) * 100));

                return (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3" key={batch.batch_id}>
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-red-900">{batch.batch_number}</strong>
                      <span className="rounded-full bg-red-700 px-3 py-1 text-xs font-semibold text-white">LOW</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-red-100">
                      <span className="block h-2 rounded-full bg-red-700" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-700">
                      <span>{available.toLocaleString()} mL remaining</span>
                      <span>{percent}%</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-500">No low-stock available batches.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function MetricCard({ badge, label, value, unit = "" }) {
  return (
    <article className="min-h-28 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold tracking-wide text-slate-700">{label}</p>
        <span className="rounded bg-green-50 px-2 py-1 text-xs font-bold text-green-700">{badge}</span>
      </div>
      <p className="mt-3 text-3xl font-medium tracking-normal text-[#003b90]">
        {value}
        {unit && <span className="ml-2 text-lg text-[#4b77c4]">{unit}</span>}
      </p>
    </article>
  );
}

function TaskItem({ label, title, detail }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-[#003b90] shadow-sm">
        {label}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

export default Dashboard;
