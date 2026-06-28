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

function Dashboard() {
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";

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
  }, [apiBase]);

  const availableBatches = useMemo(() => summary.availableBatches || [], [summary.availableBatches]);
  const recentBatches = availableBatches.slice(0, 4);
  const lowStockBatches = useMemo(() => {
    return [...availableBatches]
      .sort((left, right) => Number(left.available_volume || 0) - Number(right.available_volume || 0))
      .slice(0, 2);
  }, [availableBatches]);

  if (loading) {
    return <p className="text-slate-600">Loading dashboard...</p>;
  }

  return (
    <section className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold tracking-normal text-[#003b90]">System Dashboard</h2>
          <p className="mt-2 text-slate-600">Real-time status for {formatDateLabel()}</p>
        </div>
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard badge="+ Live" label="Total Milk in Stock" value={Number(summary.availableMilk).toLocaleString()} unit="mL" />
        <MetricCard badge="Stable" label="Active Donors" value={summary.donorCount} />
        <MetricCard badge={`+${summary.pendingInquiryCount}`} label="Beneficiaries" value={summary.beneficiaryCount} />
        <MetricCard badge="Active" label="Pasteurization in Progress" value={summary.pasteurizationCount} unit="Batches" />
      </div>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,2fr)_344px]">
        <div className="space-y-7">
          <section className="rounded-lg border border-slate-300 bg-white p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-medium tracking-normal text-[#003b90]">Volume Trends</h3>
                <p className="mt-1 text-slate-600">Available volume by batch</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#1d5bc4]" />
                  Available
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#b14050]" />
                  Capacity
                </span>
              </div>
            </div>

            <div className="mt-10 flex min-h-[300px] items-end gap-6 px-4">
              {recentBatches.length ? (
                recentBatches.map((batch, index) => {
                  const available = Number(batch.available_volume || 0);
                  const total = Math.max(Number(batch.total_volume || available || 1), 1);
                  const availableHeight = Math.min(220, Math.max(34, (available / total) * 220));
                  const totalHeight = Math.min(220, Math.max(44, 220 - index * 18));

                  return (
                    <div className="flex flex-1 flex-col items-center gap-3" key={batch.batch_id}>
                      <div className="flex h-[230px] items-end justify-center gap-2">
                        <span
                          className="w-3 rounded-t-sm bg-[#1d5bc4]"
                          style={{ height: `${availableHeight}px` }}
                        />
                        <span
                          className="w-3 rounded-t-sm bg-[#b14050]/55"
                          style={{ height: `${totalHeight}px` }}
                        />
                      </div>
                      <span className="max-w-24 truncate text-xs text-slate-500">{batch.batch_number}</span>
                    </div>
                  );
                })
              ) : (
                <p className="self-center text-slate-500">No available batches yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-300 bg-white">
            <div className="flex items-center justify-between border-b border-slate-300 px-7 py-5">
              <h3 className="text-2xl font-medium tracking-normal text-[#003b90]">Recent Activity</h3>
              <span className="text-sm font-semibold text-[#003b90]">Current batches</span>
            </div>
            <div className="divide-y divide-slate-300">
              {recentBatches.length ? (
                recentBatches.map((batch) => (
                  <div className="flex items-center gap-4 px-7 py-4" key={batch.batch_id}>
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-green-100 text-sm font-bold text-green-700">
                      OK
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">
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
                <p className="px-7 py-5 text-slate-500">No available batch activity yet.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-7">
          <section className="rounded-lg border border-slate-300 bg-white p-6">
            <h3 className="text-2xl font-medium tracking-normal text-[#003b90]">Low Stock Alerts</h3>
            <div className="mt-5 space-y-4">
              {lowStockBatches.length ? (
                lowStockBatches.map((batch) => {
                  const available = Number(batch.available_volume || 0);
                  const total = Math.max(Number(batch.total_volume || available || 1), 1);
                  const percent = Math.min(100, Math.round((available / total) * 100));

                  return (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4" key={batch.batch_id}>
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

          <section className="rounded-lg bg-[#1d5bc4] p-6 text-white">
            <h3 className="text-2xl font-medium tracking-normal">Inventory Status</h3>
            <p className="mt-3 text-sm text-blue-100">
              {availableBatches.length} available batch{availableBatches.length === 1 ? "" : "es"} ready for dispensing.
            </p>
            <div className="mt-6 rounded-md bg-white/20 px-4 py-3 text-center text-sm font-semibold">
              {Number(summary.availableMilk).toLocaleString()} mL available
            </div>
          </section>

          <section className="rounded-lg border border-slate-300 bg-white p-6">
            <h3 className="text-2xl font-medium tracking-normal text-[#003b90]">Operational Tasks</h3>
            <div className="mt-5 space-y-4">
              <TaskItem label="INQ" title="Pending Inquiries" detail={`${summary.pendingInquiryCount} request(s) waiting`} />
              <TaskItem label="PAS" title="Pasteurization" detail={`${summary.pasteurizationCount} batch(es) in process`} />
              <TaskItem label="DIS" title="Dispensing" detail={`${availableBatches.length} batch(es) available`} />
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function MetricCard({ badge, label, value, unit = "" }) {
  return (
    <article className="min-h-36 rounded-lg border border-slate-300 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-semibold tracking-wide text-slate-700">{label}</p>
        <span className="rounded bg-green-50 px-2 py-1 text-xs font-bold text-green-700">{badge}</span>
      </div>
      <p className="mt-4 text-4xl font-medium tracking-normal text-[#003b90]">
        {value}
        {unit && <span className="ml-2 text-xl text-[#4b77c4]">{unit}</span>}
      </p>
    </article>
  );
}

function TaskItem({ label, title, detail }) {
  return (
    <div className="flex items-start gap-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-slate-100 text-sm font-bold text-[#003b90]">
        {label}
      </span>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

export default Dashboard;
