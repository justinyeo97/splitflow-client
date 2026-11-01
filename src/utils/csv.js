// Quote every cell and neutralize spreadsheet formulas in untrusted text.
export function csvCell(value) {
  let text = value == null ? "" : String(value);
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text))
    text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function reportCsv(rows, columns) {
  return (
    "\uFEFF" +
    [
      columns.map(([label]) => csvCell(label)).join(","),
      ...rows.map((row) =>
        columns
          .map(([, key]) =>
            csvCell(typeof key === "function" ? key(row) : row[key]),
          )
          .join(","),
      ),
    ].join("\r\n")
  );
}

export function downloadReport(filename, rows, columns) {
  const url = URL.createObjectURL(
    new Blob([reportCsv(rows, columns)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
