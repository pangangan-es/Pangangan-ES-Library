export type CsvValue = string | number | null | undefined;

/**
 * Escape one CSV field (RFC 4180) and neutralise spreadsheet formula injection:
 * text starting with = + - @ or a control character is prefixed with an
 * apostrophe so Excel/Sheets treat it as plain text.
 */
export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function buildCsv(header: string[], rows: CsvValue[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  // UTF-8 BOM so Excel opens accented names correctly; CRLF per RFC 4180.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
