import { useState } from "react";
import { Star, Trash2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/Button";
import { CheckboxField, TextField } from "@/components/Fields";
import { ConfirmDialog } from "@/components/Dialog";
import { Badge, EmptyState, ErrorState, LoadingBlock } from "@/components/Feedback";
import { PageHeader } from "@/components/PageHeader";
import { ResponsiveList, type Column } from "@/components/ResponsiveList";
import { useToast } from "@/components/Toast";
import { useAsync } from "@/hooks/useAsync";
import { useDebounced } from "@/hooks/useDebounced";
import { BookDialog } from "@/features/books/BookDialog";
import {
  checkHasSampleBooks,
  clearAllSampleData,
  deleteBook,
  listInventory,
  setBookArchived,
  toggleFeaturedBook,
} from "@/features/books/bookService";
import { listCategories } from "@/features/settings/referenceService";
import { toMessage } from "@/lib/errors";
import type { InventoryBook } from "@/types/domain";

type Pending = { kind: "archive" | "restore" | "delete"; book: InventoryBook };

export default function AdminBooksPage() {
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<InventoryBook | "new" | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [clearingSampleModal, setClearingSampleModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const debounced = useDebounced(search);

  const books = useAsync(() => listInventory(debounced, showArchived), [debounced, showArchived]);
  const categories = useAsync(() => listCategories(), []);
  const sampleCheck = useAsync(() => checkHasSampleBooks(), []);

  async function runPending() {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === "delete") await deleteBook(pending.book.id);
      else await setBookArchived(pending.book.id, pending.kind === "archive");
      notify(
        "success",
        pending.kind === "delete"
          ? `Deleted “${pending.book.title}”.`
          : pending.kind === "archive"
          ? `Archived “${pending.book.title}”.`
          : `Restored “${pending.book.title}”.`
      );
      setPending(null);
      books.reload();
      sampleCheck.reload();
    } catch (err) {
      notify("error", toMessage(err, "That could not be done."));
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleFeatured(book: InventoryBook) {
    try {
      const next = !book.is_featured;
      await toggleFeaturedBook(book.id, next);
      notify(
        "success",
        next
          ? `“${book.title}” is now the Librarian's Pick of the Week.`
          : `Unset “${book.title}” as featured book.`
      );
      books.reload();
    } catch (err) {
      notify("error", toMessage(err, "Could not update featured status."));
    }
  }

  async function handleConfirmClearSample() {
    setBusy(true);
    try {
      const count = await clearAllSampleData();
      notify("success", `Cleared ${count} sample demo book(s) and announcements.`);
      setClearingSampleModal(false);
      books.reload();
      sampleCheck.reload();
    } catch (err) {
      notify("error", toMessage(err, "Could not clear sample data."));
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<InventoryBook>[] = [
    {
      header: "Title & Author",
      cell: (b) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-ink-900">{b.title}</span>
            {b.is_featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 text-gold-900 px-2 py-0.5 text-[10px] font-bold border border-gold-300">
                <Star className="h-3 w-3 fill-gold-500 text-gold-600" />
                Featured
              </span>
            )}
            {b.is_sample && (
              <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-800 px-2 py-0.5 text-[10px] font-semibold border border-amber-200">
                Sample
              </span>
            )}
          </div>
          <span className="block text-xs text-ink-600 mt-0.5">{b.author}</span>
        </div>
      ),
    },
    { header: "Category", cell: (b) => b.category_name ?? "None" },
    {
      header: "Copies",
      cell: (b) => `${b.total_copies} total, ${Math.max(b.total_copies - b.on_loan, 0)} available`,
    },
    { header: "On loan", cell: (b) => b.on_loan },
    {
      header: "Status",
      cell: (b) =>
        b.is_archived ? <Badge tone="warn">Archived</Badge> : <Badge tone="good">In catalog</Badge>,
    },
  ];

  const hasSampleActive = Boolean(sampleCheck.data && !bannerDismissed);

  return (
    <div className="space-y-6">
      {/* Sample Data Cleanup Amber Banner */}
      {hasSampleActive && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm text-amber-950">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm">
                Sample demo books are currently active.
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Ready to encode Pangangan Elementary School's real physical inventory? You can clear all 15 sample books in one click.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              variant="danger"
              className="!py-1.5 !px-3 text-xs"
              onClick={() => setClearingSampleModal(true)}
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
        title="Books"
        intro="Manage the library collection. Add, edit, archive or feature titles for the public catalog."
        action={
          <Button variant="accent" onClick={() => setEditing("new")}>
            + Add a book
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="w-full max-w-md">
          <TextField
            label="Search books"
            type="search"
            placeholder="Title, author or ISBN"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <CheckboxField
          label="Show archived"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />
      </div>

      <div aria-live="polite">
        {books.loading && !books.data ? <LoadingBlock label="Loading books" /> : null}
        {books.error ? <ErrorState message={books.error} onRetry={books.reload} /> : null}
        {books.data && !books.error ? (
          books.data.length === 0 ? (
            <EmptyState
              title={debounced ? "No books match your search" : "No books in catalog"}
              action={
                !debounced ? (
                  <Button variant="accent" onClick={() => setEditing("new")}>
                    Add the first book
                  </Button>
                ) : undefined
              }
            >
              {debounced
                ? "Try a different search term or check your spelling."
                : "Add books so students and teachers can browse and borrow them."}
            </EmptyState>
          ) : (
            <ResponsiveList
              caption="Books"
              rows={books.data}
              rowKey={(b) => b.id}
              columns={columns}
              actions={(b) => (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    variant="secondary"
                    className="!min-h-[34px] !py-1 text-xs"
                    onClick={() => handleToggleFeatured(b)}
                    title={b.is_featured ? "Unmark featured" : "Feature on homepage"}
                  >
                    <Star
                      className={`h-3.5 w-3.5 mr-1 ${
                        b.is_featured ? "fill-gold-500 text-gold-600" : "text-ink-400"
                      }`}
                    />
                    {b.is_featured ? "Featured" : "Feature"}
                  </Button>

                  <Button
                    variant="secondary"
                    className="!min-h-[34px] !py-1 text-xs"
                    onClick={() => setEditing(b)}
                    aria-label={`Edit ${b.title}`}
                  >
                    Edit
                  </Button>

                  {b.is_archived ? (
                    <Button
                      variant="secondary"
                      className="!min-h-[34px] !py-1 text-xs"
                      onClick={() => setPending({ kind: "restore", book: b })}
                      aria-label={`Restore ${b.title}`}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      className="!min-h-[34px] !py-1 text-xs"
                      onClick={() => setPending({ kind: "archive", book: b })}
                      aria-label={`Archive ${b.title}`}
                    >
                      Archive
                    </Button>
                  )}

                  {!b.has_history || b.is_sample ? (
                    <Button
                      variant="danger"
                      className="!min-h-[34px] !py-1 text-xs"
                      onClick={() => setPending({ kind: "delete", book: b })}
                      aria-label={`Delete ${b.title}`}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              )}
            />
          )
        ) : null}
      </div>

      {/* Book Edit / Create Dialog */}
      {editing ? (
        <BookDialog
          book={editing === "new" ? null : editing}
          categories={categories.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            notify("success", msg);
            setEditing(null);
            books.reload();
            sampleCheck.reload();
          }}
        />
      ) : null}

      {/* Archive / Delete Confirm Dialog */}
      {pending ? (
        <ConfirmDialog
          title={
            pending.kind === "delete"
              ? `Delete “${pending.book.title}”?`
              : pending.kind === "archive"
              ? `Archive “${pending.book.title}”?`
              : `Restore “${pending.book.title}”?`
          }
          message={
            pending.kind === "delete"
              ? "This permanently removes the book record from the system. This cannot be undone."
              : pending.kind === "archive"
              ? "Archiving hides the title from the public catalog while preserving its historical loan records."
              : "Restoring makes this book visible again in the public catalog and ready for checkout."
          }
          confirmLabel={
            pending.kind === "delete"
              ? "Delete book"
              : pending.kind === "archive"
              ? "Archive book"
              : "Restore book"
          }
          destructive={pending.kind === "delete"}
          onCancel={() => setPending(null)}
          onConfirm={runPending}
          busy={busy}
        />
      ) : null}

      {/* Clear All Sample Data Confirm Modal */}
      {clearingSampleModal ? (
        <ConfirmDialog
          title="Clear all sample demo data?"
          message="This will permanently delete all 15 sample Philippine elementary books and sample demo announcements. The 10 categories, borrower accounts, and any books you encoded manually will NOT be affected."
          confirmLabel="Yes, Clear Sample Data"
          destructive
          onCancel={() => setClearingSampleModal(false)}
          onConfirm={handleConfirmClearSample}
          busy={busy}
        />
      ) : null}
    </div>
  );
}
