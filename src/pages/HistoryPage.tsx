import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { SelectField, TextField } from "@/components/Fields";
import { Badge, EmptyState, ErrorState, InlineAlert, LoadingBlock } from "@/components/Feedback";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { SCHOOL_ADDRESS, SCHOOL_NAME } from "@/components/SchoolBrand";
import { useToast } from "@/components/Toast";
import { useAsync } from "@/hooks/useAsync";
import { useDebounced } from "@/hooks/useDebounced";
import { downloadCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import { toMessage } from "@/lib/errors";
import {
  EMPTY_FILTERS,
  STATUS_LABELS,
  fetchAllHistory,
  historyToCsv,
  listStaffDirectory,
  searchHistory,
  type HistoryFilters,
  type StatusFilter,
} from "@/features/history/historyService";
import type { LoanRow, LoanStatus } from "@/types/domain";

const PAGE_SIZE = 15;
const PRINT_CAP = 1000;

const STATUS_TONE: Record<LoanStatus, "neutral" | "warn" | "good"> = { out: "neutral", partial: "warn", returned: "good" };

function StatusBadge({ row }: { row: LoanRow }) {
  const text = row.status === "partial" ? `${STATUS_LABELS.partial} (${row.outstanding_qty} out)` : row.status === "out" ? `${STATUS_LABELS.out} (${row.outstanding_qty} out)` : STATUS_LABELS.returned;
  return <Badge tone={STATUS_TONE[row.status]}>{text}</Badge>;
}

function describeFilters(f: HistoryFilters, staffName: string | undefined): string {
  const parts: string[] = [];
  if (f.search) parts.push(`search “${f.search}”`);
  if (f.borrower) parts.push(`borrower “${f.borrower}”`);
  if (staffName) parts.push(`issued by ${staffName}`);
  if (f.status) parts.push(f.status === "open" ? "status: not fully returned" : `status: ${STATUS_LABELS[f.status]}`);
  if (f.borrowedFrom || f.borrowedTo) parts.push(`borrowed ${f.borrowedFrom || "…"} to ${f.borrowedTo || "…"}`);
  if (f.returnedFrom || f.returnedTo) parts.push(`last returned ${f.returnedFrom || "…"} to ${f.returnedTo || "…"}`);
  return parts.length ? parts.join("; ") : "none (all records)";
}

export default function HistoryPage() {
  const { notify } = useToast();
  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [printRows, setPrintRows] = useState<LoanRow[] | null>(null);
  const [printNote, setPrintNote] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  // Debounce only the free-text boxes; selects and dates apply immediately.
  const debouncedSearch = useDebounced(filters.search);
  const debouncedBorrower = useDebounced(filters.borrower);
  const applied: HistoryFilters = { ...filters, search: debouncedSearch, borrower: debouncedBorrower };
  const key = JSON.stringify(applied);

  useEffect(() => setPage(0), [key]);

  const staff = useAsync(() => listStaffDirectory(), []);
  const results = useAsync(() => searchHistory(applied, page, PAGE_SIZE), [key, page]);

  const set = <K extends keyof HistoryFilters>(k: K, v: HistoryFilters[K]) => setFilters((cur) => ({ ...cur, [k]: v }));
  const staffName = staff.data?.find((s) => s.id === applied.staffId)?.full_name;
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  async function exportCsv() {
    setExporting(true);
    try {
      const { rows, truncated } = await fetchAllHistory(applied);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`pangangan-library-circulation-${stamp}.csv`, historyToCsv(rows));
      notify(
        "success",
        truncated ? `Exported the first ${rows.length} records. Narrow the filters to export the rest.` : `Exported ${rows.length} records.`,
      );
    } catch (err) {
      notify("error", toMessage(err, "The export failed. Nothing was downloaded."));
    } finally {
      setExporting(false);
    }
  }

  async function printReport() {
    setPrinting(true);
    try {
      const { rows } = await fetchAllHistory(applied, PRINT_CAP);
      setPrintNote(rows.length >= PRINT_CAP ? `Only the first ${PRINT_CAP} matching records are shown. Narrow the filters for a complete report.` : null);
      setPrintRows(rows);
    } catch (err) {
      notify("error", toMessage(err, "Could not prepare the report."));
      setPrinting(false);
    }
  }

  // Print once the report has rendered, then clear it.
  useEffect(() => {
    if (!printRows) return;
    const t = window.setTimeout(() => {
      window.print();
      setPrintRows(null);
      setPrinting(false);
    }, 100);
    return () => window.clearTimeout(t);
  }, [printRows]);

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Circulation history"
          intro="Every loan with its separate return transactions. Records are permanent; this list cannot be edited or deleted."
          action={
            <>
              <Button onClick={() => void printReport()} loading={printing}>
                Print report
              </Button>
              <Button variant="accent" onClick={() => void exportCsv()} loading={exporting}>
                Export CSV
              </Button>
            </>
          }
        />

        <form
          aria-label="Filter circulation history"
          onSubmit={(e) => e.preventDefault()}
          className="mb-6 grid gap-4 rounded-lg border border-ink-100 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <TextField label="Book or borrower" type="search" value={filters.search} onChange={(e) => set("search", e.target.value)} />
          <TextField label="Borrower name" type="search" value={filters.borrower} onChange={(e) => set("borrower", e.target.value)} />
          <SelectField label="Issued by" value={filters.staffId} onChange={(e) => set("staffId", e.target.value)}>
            <option value="">All staff</option>
            {(staff.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
                {s.is_active ? "" : " (inactive)"}
              </option>
            ))}
          </SelectField>
          <SelectField label="Status" value={filters.status} onChange={(e) => set("status", e.target.value as StatusFilter)}>
            <option value="">All statuses</option>
            <option value="open">Not fully returned</option>
            <option value="out">{STATUS_LABELS.out}</option>
            <option value="partial">{STATUS_LABELS.partial}</option>
            <option value="returned">{STATUS_LABELS.returned}</option>
          </SelectField>
          <TextField label="Borrowed from" type="date" value={filters.borrowedFrom} onChange={(e) => set("borrowedFrom", e.target.value)} />
          <TextField label="Borrowed to" type="date" value={filters.borrowedTo} onChange={(e) => set("borrowedTo", e.target.value)} />
          <TextField label="Last returned from" type="date" value={filters.returnedFrom} onChange={(e) => set("returnedFrom", e.target.value)} />
          <TextField label="Last returned to" type="date" value={filters.returnedTo} onChange={(e) => set("returnedTo", e.target.value)} />
          <div className="sm:col-span-2 lg:col-span-4">
            <Button onClick={() => setFilters(EMPTY_FILTERS)} disabled={!hasFilters}>
              Reset filters
            </Button>
          </div>
        </form>

        <div aria-live="polite">
          {results.loading && !results.data ? <LoadingBlock label="Loading history" /> : null}
          {results.error ? <ErrorState message={results.error} onRetry={results.reload} /> : null}
          {results.data && !results.error ? (
            results.data.rows.length === 0 ? (
              <EmptyState title="No records match">
                {hasFilters ? "Try widening the dates or resetting the filters." : "Loans will appear here once books are checked out."}
              </EmptyState>
            ) : (
              <>
                <p className="mb-3 text-sm text-ink-700">{results.data.total} {results.data.total === 1 ? "record" : "records"}</p>
                <ul className="space-y-3">
                  {results.data.rows.map((row) => (
                    <li key={row.id} className="rounded-lg border border-ink-100 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h2 className="font-display text-lg font-semibold leading-snug text-ink-900">{row.book_title}</h2>
                          <p className="text-sm text-ink-700">{row.book_author}</p>
                        </div>
                        <StatusBadge row={row} />
                      </div>
                      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div><dt className="text-ink-500">Borrower</dt><dd>{row.borrower_name}</dd></div>
                        <div><dt className="text-ink-500">Class</dt><dd>{[row.grade_level_name, row.section_name].filter(Boolean).join(" · ") || "Not recorded"}</dd></div>
                        <div><dt className="text-ink-500">Quantity</dt><dd>{row.quantity} borrowed, {row.returned_qty} returned</dd></div>
                        <div><dt className="text-ink-500">Borrowed</dt><dd>{formatDateTime(row.borrowed_at)} by {row.issued_by_name}</dd></div>
                      </dl>
                      {row.legacy_date_flag ? <div className="mt-2"><InlineAlert kind="warn">{row.legacy_date_flag}</InlineAlert></div> : null}
                      <details className="mt-3">
                        <summary className="min-h-[44px] cursor-pointer py-2 text-sm font-semibold text-teal-700">
                          Return transactions ({row.transactions.length})
                        </summary>
                        {row.transactions.length === 0 ? (
                          <p className="text-sm text-ink-700">No returns recorded yet.</p>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {row.transactions.map((t) => (
                              <li key={t.id}>
                                {t.quantity} {t.quantity === 1 ? "copy" : "copies"} on {formatDateTime(t.returned_at)}, received by {t.received_by_name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </details>
                    </li>
                  ))}
                </ul>
                <Pagination page={page} pageSize={PAGE_SIZE} total={results.data.total} onPage={setPage} />
              </>
            )
          ) : null}
        </div>
      </div>

      {/* Print-only report. Contains borrower names: for library staff use only. */}
      {printRows ? (
        <section className="print-only" aria-label="Printable circulation report">
          <h1 style={{ fontSize: "16pt", fontWeight: 700 }}>{SCHOOL_NAME} Library</h1>
          <p>{SCHOOL_ADDRESS}</p>
          <h2 style={{ fontSize: "13pt", fontWeight: 700, marginTop: 8 }}>Circulation report</h2>
          <p>Generated: {formatDateTime(new Date().toISOString())}</p>
          <p>Filters: {describeFilters(applied, staffName)}</p>
          <p>Records: {printRows.length}. Confidential: contains borrower names. For library staff use only.</p>
          {printNote ? <p>{printNote}</p> : null}
          <table style={{ marginTop: 8, fontSize: "9pt" }}>
            <thead>
              <tr>
                <th>Book</th>
                <th>Borrower</th>
                <th>Class</th>
                <th>Qty (out / back)</th>
                <th>Borrowed</th>
                <th>Returns</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {printRows.map((r) => (
                <tr key={r.id}>
                  <td>{r.book_title}<br />{r.book_author}</td>
                  <td>{r.borrower_name}</td>
                  <td>{[r.grade_level_name, r.section_name].filter(Boolean).join(" · ")}</td>
                  <td>{r.quantity} / {r.returned_qty}</td>
                  <td>{formatDateTime(r.borrowed_at)}<br />{r.issued_by_name}</td>
                  <td>
                    {r.transactions.length === 0
                      ? "None"
                      : r.transactions.map((t) => (
                          <div key={t.id}>{t.quantity} on {formatDateTime(t.returned_at)} ({t.received_by_name})</div>
                        ))}
                  </td>
                  <td>{STATUS_LABELS[r.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
