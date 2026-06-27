import { useEffect, useState } from "react";

const emptySummary = {
  availableMilk: 0,
  donorCount: 0,
  beneficiaryCount: 0,
  pendingInquiryCount: 0,
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

  const recentBatches = [...summary.availableBatches].slice(0, 4);
  const lowStockBatches = [...summary.availableBatches]
    .sort((a, b) => Number(a.available_volume || 0) - Number(b.available_volume || 0))
    .slice(0, 2);

  if (loading) {
    return <p className="px-1 py-6 text-slate-600">Loading dashboard...</p>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-[300px] flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <span className="text-xl text-slate-400">⌕</span>
          <input
            aria-label="Search dashboard"
            placeholder="Search donors, batches or beneficiaries"
            type="search"
            className="w-full border-0 bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
        <button
          type="button"
          className="rounded-full bg-rose-400 px-5 py-3 text-sm font-semibold text-rose-950 shadow-sm transition hover:bg-rose-300"
        >
          Emergency Alerts
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-semibold text-slate-800">Human Milk Bank</p>
            <p className="text-sm text-slate-500">Operations view</p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-slate-200 to-slate-400 font-bold text-slate-900">
            HM
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-800">System Dashboard</h2>
          <p className="mt-2 text-slate-500">Real-time status for {formatDateLabel()}</p>
        </div>
        {error && <p className="font-semibold text-rose-600">{error}</p>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total Milk in Stock</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <strong className="text-4xl font-semibold tracking-tight text-slate-800">
                  {Number(summary.availableMilk).toLocaleString()} mL
                </strong>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  +12.5%
                </span>
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Active Donors</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <strong className="text-4xl font-semibold tracking-tight text-slate-800">
                  {summary.donorCount}
                </strong>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Stable
                </span>
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Beneficiaries Served</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <strong className="text-4xl font-semibold tracking-tight text-slate-800">
                  {summary.beneficiaryCount}
                </strong>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  +{summary.pendingInquiryCount}
                </span>
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Pending Inquiries</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <strong className="text-4xl font-semibold tracking-tight text-slate-800">
                  {summary.pendingInquiryCount}
                </strong>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                  Active
                </span>
              </div>
            </article>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">Available Batch Trend</h3>
                <p className="mt-1 text-sm text-slate-500">Current stock across the most recent batches</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Updated live
              </span>
            </div>

            <div className="mt-8 flex min-h-[280px] items-end gap-4">
              {recentBatches.length ? (
                recentBatches.map((batch, index) => {
                  const value = Math.max(Number(batch.available_volume || 0), 1);
                  const height = Math.min(220, Math.max(60, value / 6));
                  return (
                    <div key={batch.batch_id} className="flex flex-1 flex-col items-center gap-3">
                      <div className="flex h-[240px] items-end justify-center gap-2">
                        <span
                          className="w-3 rounded-t-full bg-slate-600"
                          style={{ height: `${height}px` }}
                        />
                        <span
                          className="w-3 rounded-t-full bg-rose-300"
                          style={{ height: `${Math.max(28, height - 20 - index * 5)}px` }}
                        />
                      </div>
                      <small className="text-xs text-slate-500">{batch.batch_number}</small>
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-500">No batches available yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h3 className="text-xl font-semibold text-slate-800">Recent Batches</h3>
              <p className="mt-1 text-sm text-slate-500">Available milk ready for allocation</p>
            </div>
            <div className="space-y-3">
              {recentBatches.length ? (
                recentBatches.map((batch) => (
                  <div
                    key={batch.batch_id}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 font-bold text-emerald-700">
                      ✓
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800">{batch.batch_number}</p>
                      <p className="text-sm text-slate-500">
                        {Number(batch.available_volume || 0).toLocaleString()} mL available
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                      {batch.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No batch activity yet.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h3 className="text-xl font-semibold text-blue-800">Low Stock Alerts</h3>
              <p className="mt-1 text-sm text-slate-500">Review batches that need attention</p>
            </div>
            <div className="space-y-4">
              {lowStockBatches.length ? (
                lowStockBatches.map((batch) => (
                  <div key={batch.batch_id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-rose-900">{batch.batch_number}</strong>
                      <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">
                        Low
                      </span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-rose-100">
                      <span
                        className="block h-2 rounded-full bg-gradient-to-r from-rose-600 to-rose-400"
                        style={{
                          width: `${Math.min(
                            100,
                            (Number(batch.available_volume || 0) / Math.max(Number(batch.total_volume || 1), 1)) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                      <span>{Number(batch.available_volume || 0).toLocaleString()} mL remaining</span>
                      <span>Min watch</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No low stock batches right now.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-300 bg-slate-700 p-5 text-slate-50 shadow-sm">
            <h3 className="text-xl font-semibold">Inventory Sync</h3>
            <p className="mt-2 text-sm text-slate-200">
              Last automatic synchronization was successful.
            </p>
            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-slate-200 px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Force Update
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h3 className="text-xl font-semibold text-blue-800">Upcoming Tasks</h3>
              <p className="mt-1 text-sm text-slate-500">Quick reminders for the day</p>
            </div>
            <div className="space-y-3">
              {[
                ["JUN 13", "Weekly Lab Calibration", "Scheduled for 09:00 AM"],
                ["JUN 15", "Donor Training Seminar", "Community Center Hall B"],
                ["JUN 17", "Monthly Safety Audit", "Internal Compliance Review"],
              ].map(([date, title, subtitle]) => (
                <div key={title} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="min-w-12 rounded-xl bg-white px-2 py-2 text-center text-[11px] font-bold text-slate-500 shadow-sm">
                    {date}
                  </span>
                  <div>
                    <strong className="block text-slate-800">{title}</strong>
                    <p className="text-sm text-slate-500">{subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default Dashboard;
