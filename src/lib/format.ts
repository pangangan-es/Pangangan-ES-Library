/** Display dates in the visitor's own locale and timezone. Stored values stay ISO/timezone-aware. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function daysOut(iso: string): string {
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return "";
  const days = Math.floor((Date.now() - start) / 86_400_000);
  if (days <= 0) return "Today";
  return days === 1 ? "1 day" : `${days} days`;
}

/** "YYYY-MM-DD" (from <input type="date">) to the ISO instant at local start of that day. */
export function startOfLocalDayIso(dateInput: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** ISO instant at local start of the day AFTER the given date (exclusive upper bound). */
export function startOfNextLocalDayIso(dateInput: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
