import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge, ErrorState, LoadingBlock } from "@/components/Feedback";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/Dialog";
import { useAuth } from "@/features/auth/AuthProvider";
import { ACCESS, can } from "@/features/auth/access";
import { useToast } from "@/components/Toast";
import { useAsync } from "@/hooks/useAsync";
import { checkHasSampleBooks, clearAllSampleData } from "@/features/books/bookService";
import { fetchDashboardStats, fetchRecentLoans } from "@/features/dashboard/dashboardService";
import { formatDateTime } from "@/lib/format";
import { toMessage } from "@/lib/errors";
import { ROLE_LABELS } from "@/types/domain";

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-ink-700">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-ink-900">{value.toLocaleString()}</p>
      {note ? <p className="mt-1 text-xs text-ink-500">{note}</p> : null}
    </div>
  );
}

function CirculationOverview() {
  const stats = useAsync(() => fetchDashboardStats(), []);
  const recent = useAsync(() => fetchRecentLoans(6), []);

  if (stats.loading && !stats.data) return <LoadingBlock label="Loading overview" />;
  if (stats.error || !stats.data)
    return <ErrorState message={stats.error ?? "Could not load the overview."} onRetry={stats.reload} />;
  const s = stats.data;

  return (
    <div className="space-y-8">
      <section aria-labelledby="stats-h">
        <h2 id="stats-h" className="sr-only">
          Library figures
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="Book titles" value={s.titles} note="Titles in the catalog (archived excluded)" />
          <Stat label="Total copies" value={s.total_copies} />
          <Stat label="Copies on loan" value={s.copies_on_loan} note="Borrowed minus returned, all loans" />
          <Stat label="Open loans" value={s.open_loans} note="Loans with copies still out" />
          <Stat label="Checkouts today" value={s.loans_today} note="Since midnight, Philippine time" />
          <Stat label="Returns today" value={s.returns_today} note="Return transactions, same period" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="recent-h" className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <h2 id="recent-h" className="font-display text-lg font-bold text-navy-900">
            Latest checkouts
          </h2>
          {recent.data && recent.data.length > 0 ? (
            <ul className="mt-3 divide-y divide-ink-100">
              {recent.data.map((l) => (
                <li key={l.id} className="py-2.5 text-sm">
                  <p className="font-semibold text-ink-900">{l.book_title}</p>
                  <p className="text-xs text-ink-600">
                    {l.quantity} to {l.borrower_name} · {formatDateTime(l.borrowed_at)}
                  </p>
                  <div className="mt-1">
                    <Badge tone={l.status === "returned" ? "good" : l.status === "partial" ? "warn" : "neutral"}>
                      {l.status === "returned" ? "Returned" : l.status === "partial" ? `${l.outstanding_qty} still out` : "Out"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-700">No checkouts recorded yet.</p>
          )}
        </section>

        <section aria-labelledby="top-h" className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <h2 id="top-h" className="font-display text-lg font-bold text-navy-900">
            Most borrowed (all time)
          </h2>
          <h3 className="mt-3 text-xs font-bold uppercase tracking-wider text-ink-500">Books, by copies lent</h3>
          <ol className="mt-1 list-decimal pl-5 text-sm text-ink-800 space-y-1">
            {s.top_books.length === 0 ? <li className="list-none text-ink-500">No loan data yet.</li> : null}
            {s.top_books.map((b) => (
              <li key={b.title}>
                <span className="font-medium">{b.title}</span> <span className="text-ink-500 text-xs">({b.copies} copies)</span>
              </li>
            ))}
          </ol>
          <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-ink-500">Borrowers, by number of loans</h3>
          <ol className="mt-1 list-decimal pl-5 text-sm text-ink-800 space-y-1">
            {s.top_borrowers.length === 0 ? <li className="list-none text-ink-500">No borrower data yet.</li> : null}
            {s.top_borrowers.map((b) => (
              <li key={b.name}>
                <span className="font-medium">{b.name}</span> <span className="text-ink-500 text-xs">({b.loans} loans)</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

export default function StaffHomePage() {
  const { notify } = useToast();
  const { profile, role } = useAuth();
  const circulation = can(role, ACCESS.circulation);
  const admin = can(role, ACCESS.admin);

  const sampleCheck = useAsync(() => checkHasSampleBooks(), []);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [clearingModal, setClearingModal] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleConfirmClearSample() {
    setBusy(true);
    try {
      const count = await clearAllSampleData();
      notify("success", `Cleared ${count} sample demo book(s) and announcements.`);
      setClearingModal(false);
      sampleCheck.reload();
    } catch (err) {
      notify("error", toMessage(err, "Could not clear sample data."));
    } finally {
      setBusy(false);
    }
  }

  const showSampleBanner = admin && Boolean(sampleCheck.data && !bannerDismissed);

  return (
    <div className="space-y-6">
      {/* Sample Data Cleanup Banner */}
      {showSampleBanner && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm text-amber-950">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm">
                Sample demo books are currently active. Ready to encode Pangangan ES's real inventory?
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                You can clear all 15 demo books in one click when you are ready to input official school catalog books.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              variant="danger"
              className="!py-1.5 !px-3 text-xs"
              onClick={() => setClearingModal(true)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Clear All Sample Data
            </Button>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              className="rounded-lg p-1.5 text-amber-700 hover:bg-amber-200/60 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <PageHeader
        title={`Welcome, ${profile?.full_name.split(" ")[0] ?? ""}`}
        intro={role ? `Signed in as ${ROLE_LABELS[role]}.` : undefined}
        action={
          circulation ? (
            <Link
              to="/staff/loans"
              className="inline-flex min-h-[44px] items-center rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-4 text-sm font-bold text-navy-950 shadow-md hover:from-gold-600 hover:to-gold-700 transition-all"
            >
              Record a loan or return
            </Link>
          ) : undefined
        }
      />

      {circulation ? (
        <CirculationOverview />
      ) : (
        <div className="max-w-2xl rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-navy-900">Catalog access</h2>
          <p className="mt-2 text-sm text-ink-700">
            Teacher accounts can search the library catalog and see availability. Recording loans and viewing borrower records is limited to
            the librarian and administrators.
          </p>
          <Link to="/catalog" className="mt-4 inline-flex min-h-[44px] items-center font-bold text-navy-900 hover:text-gold-600 transition-colors underline">
            Open the catalog →
          </Link>
        </div>
      )}

      {/* Clear All Sample Data Confirm Modal */}
      {clearingModal ? (
        <ConfirmDialog
          title="Clear all sample demo data?"
          message="This will permanently delete all 15 sample Philippine elementary books and sample demo announcements. Categories, staff accounts, and any books you encoded manually will NOT be affected."
          confirmLabel="Yes, Clear Sample Data"
          destructive
          busy={busy}
          onCancel={() => setClearingModal(false)}
          onConfirm={handleConfirmClearSample}
        />
      ) : null}
    </div>
  );
}
