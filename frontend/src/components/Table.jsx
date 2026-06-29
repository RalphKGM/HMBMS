import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;

function Table({ headers, rows, paginate = true }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const visibleRows = useMemo(
    () => (paginate ? rows.slice(startIndex, startIndex + PAGE_SIZE) : rows),
    [paginate, rows, startIndex],
  );
  const showingStart = rows.length ? startIndex + 1 : 0;
  const showingEnd = Math.min(startIndex + PAGE_SIZE, rows.length);

  useEffect(() => {
    if (paginate) {
      setPage(1);
    }
  }, [paginate, rows]);

  useEffect(() => {
    if (paginate && page > totalPages) {
      setPage(totalPages);
    }
  }, [paginate, page, totalPages]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-600"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visibleRows.length ? (
              visibleRows.map((row, index) => (
                <tr
                  key={`${startIndex}-${index}`}
                  className="transition hover:bg-slate-50/80"
                >
                  {row.map((cell, cellIndex) => {
                    const header = headers[cellIndex] || "";
                    const isActionCell = header.toLowerCase().includes("action");

                    return (
                      <td
                        key={cellIndex}
                        className={`px-4 py-3 align-top text-sm text-slate-700 ${
                          isActionCell ? "whitespace-nowrap [&>*]:mr-1.5 [&>*:last-child]:mr-0" : ""
                        }`}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-4 py-6 text-center text-slate-500">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {visibleRows.length ? (
          visibleRows.map((row, rowIndex) => (
            <article
              key={`${startIndex}-${rowIndex}`}
              className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              {row.map((cell, cellIndex) => {
                const header = headers[cellIndex] || "";
                const isActionCell = header.toLowerCase().includes("action");

                return (
                  <div
                    key={cellIndex}
                    className="border-b border-slate-100 px-4 py-3 last:border-b-0"
                  >
                    <span className="mb-1 block text-[0.72rem] font-bold uppercase tracking-[0.04em] text-slate-500">
                      {header}
                    </span>
                    <div
                      className={`min-w-0 text-sm text-slate-800 ${
                        isActionCell ? "grid gap-2 [&>*]:w-full [&_button]:min-h-9" : "break-words"
                      }`}
                    >
                      {cell}
                    </div>
                  </div>
                );
              })}
            </article>
          ))
        ) : (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-slate-500">
            No records found.
          </p>
        )}
      </div>

      {paginate && rows.length > PAGE_SIZE && (
        <div className="flex flex-col items-stretch gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm text-slate-600 sm:text-left">
            Showing {showingStart}-{showingEnd} of {rows.length}
          </p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <button
              type="button"
              className="min-h-0 px-3 py-1.5 text-xs"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="text-sm font-semibold text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="min-h-0 px-3 py-1.5 text-xs"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
