import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;

function Table({ headers, rows }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const visibleRows = useMemo(
    () => rows.slice(startIndex, startIndex + PAGE_SIZE),
    [rows, startIndex],
  );
  const showingStart = rows.length ? startIndex + 1 : 0;
  const showingEnd = Math.min(startIndex + PAGE_SIZE, rows.length);

  useEffect(() => {
    setPage(1);
  }, [rows]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
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
                <tr key={`${startIndex}-${index}`} className="transition hover:bg-slate-50/80">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3 align-top text-sm text-slate-700">
                      {cell}
                    </td>
                  ))}
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
      {rows.length > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-600">
            Showing {showingStart}-{showingEnd} of {rows.length}
          </p>
          <div className="flex items-center gap-2">
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
