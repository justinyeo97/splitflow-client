import { downloadReport } from "../utils/csv.js";

export default function ExportCsvButton({
  filename,
  rows = [],
  columns,
  disabled = false,
}) {
  return (
    <button
      type="button"
      className="secondary-action"
      disabled={disabled || !rows.length}
      onClick={() => downloadReport(filename, rows, columns)}
    >
      Export CSV
    </button>
  );
}
