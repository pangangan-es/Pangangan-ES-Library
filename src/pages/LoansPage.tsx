import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { TextField } from "@/components/Fields";
import { Badge, EmptyState, ErrorState, LoadingBlock } from "@/components/Feedback";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ResponsiveList, type Column } from "@/components/ResponsiveList";
import { useToast } from "@/components/Toast";
import { useAsync } from "@/hooks/useAsync";
import { useDebounced } from "@/hooks/useDebounced";
import { CheckoutDialog } from "@/features/loans/CheckoutDialog";
import { ReturnDialog } from "@/features/loans/ReturnDialog";
import { listActiveLoans } from "@/features/loans/loanService";
import { daysOut, formatDateTime } from "@/lib/format";
import type { LoanRow } from "@/types/domain";

const PAGE_SIZE = 20;

export default function LoansPage() {
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const [returning, setReturning] = useState<LoanRow | null>(null);
  const debounced = useDebounced(search);

  useEffect(() => setPage(0), [debounced]);
  const loans = useAsync(() => listActiveLoans({ search: debounced, page, pageSize: PAGE_SIZE }), [debounced, page]);

  const columns: Column<LoanRow>[] = [
    {
      header: "Book",
      cell: (l) => (
        <div>
          <span className="font-semibold text-ink-900">{l.book_title}</span>
          <span className="block text-ink-700">{l.book_author}</span>
        </div>
      ),
    },
    {
      header: "Borrower",
      cell: (l) => (
        <div>
          {l.borrower_name}
          <span className="block text-xs text-ink-500">
            {[l.grade_level_name, l.section_name].filter(Boolean).join(" · ") || "No class recorded"}
          </span>
        </div>
      ),
    },
    {
      header: "Still out",
      cell: (l) => (
        <Badge tone={l.status === "partial" ? "warn" : "neutral"}>
          {l.outstanding_qty} of {l.quantity}
        </Badge>
      ),
    },
    { header: "Borrowed", cell: (l) => `${formatDateTime(l.borrowed_at)} (${daysOut(l.borrowed_at)})` },
    { header: "Issued by", cell: (l) => l.issued_by_name },
  ];

  return (
    <div>
      <PageHeader
        title="Loans and returns"
        intro="Record books going out and coming back. Partial returns keep the loan open until every copy is back."
        action={
          <Button variant="accent" onClick={() => setCheckingOut(true)}>
            Record a checkout
          </Button>
        }
      />

      <div className="mb-4 max-w-md">
        <TextField label="Search active loans" type="search" placeholder="Book title or borrower name" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div aria-live="polite">
        {loans.loading && !loans.data ? <LoadingBlock label="Loading active loans" /> : null}
        {loans.error ? <ErrorState message={loans.error} onRetry={loans.reload} /> : null}
        {loans.data && !loans.error ? (
          loans.data.rows.length === 0 ? (
            <EmptyState
              title={debounced ? "No active loans match your search" : "No books are out right now"}
              action={!debounced ? <Button variant="accent" onClick={() => setCheckingOut(true)}>Record a checkout</Button> : undefined}
            >
              {debounced ? "Clear the search to see every active loan." : "When a book is checked out it will appear here until it is returned."}
            </EmptyState>
          ) : (
            <>
              <p className="mb-3 text-sm text-ink-700">{loans.data.total} active {loans.data.total === 1 ? "loan" : "loans"}</p>
              <ResponsiveList
                caption="Active loans"
                rows={loans.data.rows}
                rowKey={(l) => l.id}
                columns={columns}
                actions={(l) => (
                  <Button variant="primary" onClick={() => setReturning(l)} aria-label={`Record return for ${l.book_title} borrowed by ${l.borrower_name}`}>
                    Return
                  </Button>
                )}
              />
              <Pagination page={page} pageSize={PAGE_SIZE} total={loans.data.total} onPage={setPage} />
            </>
          )
        ) : null}
      </div>

      {checkingOut ? (
        <CheckoutDialog
          onClose={() => setCheckingOut(false)}
          onDone={(msg) => {
            setCheckingOut(false);
            notify("success", msg);
            loans.reload();
          }}
        />
      ) : null}
      {returning ? (
        <ReturnDialog
          loan={returning}
          onClose={() => setReturning(null)}
          onDone={(msg) => {
            setReturning(null);
            notify("success", msg);
            loans.reload();
          }}
        />
      ) : null}
    </div>
  );
}
