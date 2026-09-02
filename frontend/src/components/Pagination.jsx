// frontend/src/components/Pagination.jsx
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_WINDOW = 5;

/**
 * Generic client-side pagination bar.
 *
 * Props:
 *  - currentPage: number (1-indexed)
 *  - totalPages: number
 *  - onPageChange: (page: number) => void
 *  - totalItems: number (for the "Showing X–Y of Z" summary)
 *  - pageSize: number
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems = 0,
  pageSize = 25,
}) {
  if (!totalPages || totalPages <= 1) return null;

  const goTo = (page) => {
    const clamped = Math.min(Math.max(page, 1), totalPages);
    if (clamped !== currentPage) onPageChange(clamped);
  };

  // Build a small sliding window of page numbers around the current page.
  let start = Math.max(1, currentPage - Math.floor(PAGE_WINDOW / 2));
  let end = Math.min(totalPages, start + PAGE_WINDOW - 1);
  start = Math.max(1, end - PAGE_WINDOW + 1);

  const pages = [];
  for (let p = start; p <= end; p += 1) pages.push(p);

  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  const pageBtnStyle = (active) => ({
    minWidth: 32,
    height: 32,
    borderRadius: 6,
    border: active ? "1px solid var(--color-ink-800, #1f2937)" : "1px solid #e5e7eb",
    background: active ? "var(--color-ink-800, #1f2937)" : "#fff",
    color: active ? "#fff" : "var(--color-ink-800, #1f2937)",
    fontWeight: active ? 700 : 500,
    fontSize: 13,
    cursor: "pointer",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 12,
        marginBottom: 8,
      }}
    >
      <p className="text-muted" style={{ fontSize: 12.5, margin: 0 }}>
        Showing {rangeStart}–{rangeEnd} of {totalItems}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 1}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 10px" }}
        >
          <ChevronLeft size={14} />
          Previous
        </button>

        {start > 1 && (
          <>
            <button type="button" onClick={() => goTo(1)} style={pageBtnStyle(false)}>
              1
            </button>
            {start > 2 && <span style={{ padding: "0 2px", color: "var(--color-ink-500, #6b7280)" }}>…</span>}
          </>
        )}

        {pages.map((p) => (
          <button key={p} type="button" onClick={() => goTo(p)} style={pageBtnStyle(p === currentPage)}>
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && (
              <span style={{ padding: "0 2px", color: "var(--color-ink-500, #6b7280)" }}>…</span>
            )}
            <button type="button" onClick={() => goTo(totalPages)} style={pageBtnStyle(false)}>
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 10px" }}
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}