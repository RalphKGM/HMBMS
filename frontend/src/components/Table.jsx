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
      <div className="overflow-x-auto max-md:overflow-x-visible">
        <table className="min-w-full border-collapse max-md:min-w-0">
          <thead className="bg-slate-50 max-md:hidden">
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
          <tbody className="divide-y divide-slate-200 max-md:grid max-md:gap-3 max-md:divide-y-0">
            {visibleRows.length ? (
              visibleRows.map((row, index) => (
                <tr
                  key={`${startIndex}-${index}`}
                  className="transition hover:bg-slate-50/80 max-md:block max-md:w-full max-md:overflow-hidden max-md:rounded-xl max-md:border max-md:border-slate-200 max-md:bg-white"
                >
                  {row.map((cell, cellIndex) => {
                    const header = headers[cellIndex] || "";
                    const isActionCell = header.toLowerCase().includes("action");

                    return (
                      <td
                        key={cellIndex}
                        data-label={header}
                        className={`px-4 py-3 align-top text-sm text-slate-700 max-md:block max-md:w-full max-md:border-b max-md:border-slate-100 max-md:px-3 max-md:py-3 max-md:before:mb-1 max-md:before:block max-md:before:text-[0.72rem] max-md:before:font-bold max-md:before:uppercase max-md:before:tracking-[0.04em] max-md:before:text-slate-500 max-md:before:content-[attr(data-label)] last:max-md:border-b-0 ${
                          isActionCell
                            ? "whitespace-nowrap [&>*]:mr-1.5 [&>*:last-child]:mr-0 max-md:grid max-md:gap-2 max-md:whitespace-normal max-md:[&>*]:mr-0 max-md:[&>*]:w-full max-md:[&_button]:min-h-9"
                            : ""
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
