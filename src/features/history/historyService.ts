import { supabase } from "@/lib/supabase";
import { sanitizeSearch } from "@/lib/search";
import { startOfLocalDayIso, startOfNextLocalDayIso, formatDateTime } from "@/lib/format";
import { buildCsv, type CsvValue } from "@/lib/csv";
import { LOAN_COLUMNS } from "@/features/loans/loanService";
import type { LoanRow, LoanStatus, StaffDirectoryEntry } from "@/types/domain";

export type StatusFilter = "" | "open" | LoanStatus;

export interface HistoryFilters {
  search: string;
  borrower: string;
  staffId: string;
  status: StatusFilter;
  borrowedFrom: string;
  borrowedTo: string;
  returnedFrom: string;
  returnedTo: string;
}

export const EMPTY_FILTERS: HistoryFilters = {
  search: "",
  borrower: "",
  staffId: "",
  status: "",
  borrowedFrom: "",
  borrowedTo: "",
  returnedFrom: "",
  returnedTo: "",
};

/** One concrete query used by both the paged list and the bulk (print/CSV) fetch. */
async function runHistoryQuery(
  f: HistoryFilters,
  from: number,
  to: number,
): Promise<{ rows: LoanRow[]; total: number }> {
  let q = supabase
    .from("loan_history")
    .select(LOAN_COLUMNS, { count: "exact" })
    .order("borrowed_at", { ascending: false })
    .order("id", { ascending: true });

  const term = sanitizeSearch(f.search);
  if (term) q = q.or(`book_title.ilike.%${term}%,borrower_name.ilike.%${term}%`);
  const borrower = sanitizeSearch(f.borrower);
  if (borrower) q = q.ilike("borrower_name", `%${borrower}%`);
  if (f.staffId) q = q.eq("issued_by", f.staffId);
  if (f.status === "open") q = q.gt("outstanding_qty", 0);
  else if (f.status) q = q.eq("status", f.status);

  const bFrom = f.borrowedFrom ? startOfLocalDayIso(f.borrowedFrom) : null;
  const bTo = f.borrowedTo ? startOfNextLocalDayIso(f.borrowedTo) : null;
  if (bFrom) q = q.gte("borrowed_at", bFrom);
  if (bTo) q = q.lt("borrowed_at", bTo);

  const rFrom = f.returnedFrom ? startOfLocalDayIso(f.returnedFrom) : null;
  const rTo = f.returnedTo ? startOfNextLocalDayIso(f.returnedTo) : null;
  if (rFrom) q = q.gte("last_returned_at", rFrom);
  if (rTo) q = q.lt("last_returned_at", rTo);

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  return { rows: (data ?? []) as LoanRow[], total: count ?? 0 };
}

export function searchHistory(
  f: HistoryFilters,
  page: number,
  pageSize: number,
): Promise<{ rows: LoanRow[]; total: number }> {
  return runHistoryQuery(f, page * pageSize, page * pageSize + pageSize - 1);
}

/** Fetch every matching row in batches (for print and CSV). Capped to protect the browser. */
export async function fetchAllHistory(
  f: HistoryFilters,
  cap = 10_000,
): Promise<{ rows: LoanRow[]; truncated: boolean }> {
  const batch = 1000;
  const rows: LoanRow[] = [];
  for (let from = 0; from < cap; from += batch) {
    const chunk = await runHistoryQuery(f, from, from + batch - 1);
    rows.push(...chunk.rows);
    if (chunk.rows.length < batch) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

export async function listStaffDirectory(): Promise<StaffDirectoryEntry[]> {
  const { data, error } = await supabase.rpc("staff_directory");
  if (error) throw error;
  return (data ?? []) as StaffDirectoryEntry[];
}

export const STATUS_LABELS: Record<LoanStatus, string> = {
  out: "Not yet returned",
  partial: "Partly returned",
  returned: "Fully returned",
};

export function describeReturns(row: LoanRow): string {
  return row.transactions
    .map((t) => `${t.quantity} on ${formatDateTime(t.returned_at)} (received by ${t.received_by_name})`)
    .join("; ");
}

export function historyToCsv(rows: LoanRow[]): string {
  const header = [
    "Book",
    "Author",
    "Borrower",
    "Borrower type",
    "Grade level",
    "Section",
    "Quantity borrowed",
    "Quantity returned",
    "Quantity outstanding",
    "Status",
    "Borrowed at (ISO)",
    "Issued by",
    "Return transactions",
    "Data note",
  ];
  const body: CsvValue[][] = rows.map((r) => [
    r.book_title,
    r.book_author,
    r.borrower_name,
    r.borrower_type,
    r.grade_level_name,
    r.section_name,
    r.quantity,
    r.returned_qty,
    r.outstanding_qty,
    STATUS_LABELS[r.status],
    r.borrowed_at,
    r.issued_by_name,
    r.transactions
      .map((t) => `${t.quantity} returned at ${t.returned_at} received by ${t.received_by_name}`)
      .join(" | "),
    r.legacy_date_flag,
  ]);
  return buildCsv(header, body);
}
