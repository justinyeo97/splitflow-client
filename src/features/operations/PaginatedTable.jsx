import { useState } from "react";
import { Table } from "./operationsUi.jsx";

export default function PaginatedTable({ rows, columns, renderRow, label }) {
  const [pageSize, setPageSize] = useState(10);
  const [cursor, setCursor] = useState({ rows, page: 0 });
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = cursor.rows === rows ? Math.min(cursor.page, pages - 1) : 0;
  const offset = page * pageSize;
  const go = (next) =>
    setCursor({ rows, page: Math.max(0, Math.min(next, pages - 1)) });
  return (
    <>
      <Table columns={columns}>
        {rows.slice(offset, offset + pageSize).map(renderRow)}
      </Table>
      <nav
        className="pagination report-pagination"
        aria-label={`${label} pagination`}
      >
        <span aria-live="polite">
          {rows.length ? offset + 1 : 0} -{" "}
          {Math.min(offset + pageSize, rows.length)} of {rows.length}
        </span>
        <label>
          Rows per page{" "}
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setCursor({ rows, page: 0 });
            }}
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div>
          <button
            type="button"
            disabled={page === 0}
            onClick={() => go(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page + 1} of {pages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= pages}
            onClick={() => go(page + 1)}
          >
            Next
          </button>
        </div>
      </nav>
    </>
  );
}
