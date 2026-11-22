import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { CheckboxField, SelectField, TextField } from "@/components/Fields";
import { InlineAlert } from "@/components/Feedback";
import { useAsync } from "@/hooks/useAsync";
import { useDebounced } from "@/hooks/useDebounced";
import { useAuth } from "@/features/auth/AuthProvider";
import { findBooksForCheckout } from "@/features/catalog/catalogService";
import { checkoutBook } from "@/features/loans/loanService";
import { listGradeLevels, listSections } from "@/features/settings/referenceService";
import { listBorrowers } from "@/features/settings/peopleService";
import { toMessage } from "@/lib/errors";
import { validateQuantity } from "@/lib/validation";
import { BORROWER_TYPE_LABELS, type BorrowerType, type CatalogBook } from "@/types/domain";

interface Props {
  onClose: () => void;
  onDone: (summary: string) => void;
}

type Errors = Partial<Record<"book" | "quantity" | "name" | "type" | "form", string>>;

export function CheckoutDialog({ onClose, onDone }: Props) {
  const { profile } = useAuth();
  const [bookSearch, setBookSearch] = useState("");
  const debouncedSearch = useDebounced(bookSearch, 250);
  const [book, setBook] = useState<CatalogBook | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [name, setName] = useState("");
  const [type, setType] = useState<BorrowerType | "">("student");
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const matches = useAsync(() => findBooksForCheckout(debouncedSearch), [debouncedSearch]);
  const grades = useAsync(() => listGradeLevels(), []);
  const sections = useAsync(() => listSections(), []);
  const directory = useAsync(() => listBorrowers("", 500), []);

  const activeGrades = (grades.data ?? []).filter((g) => g.is_active);
  const activeSections = (sections.data ?? []).filter(
    (s) => s.is_active && (gradeId ? s.grade_level_id === gradeId || s.grade_level_id === null : true),
  );

  // If the chosen section no longer fits the grade, clear it.
  useEffect(() => {
    if (sectionId && !activeSections.some((s) => s.id === sectionId)) setSectionId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeId]);

  const qtyNumber = Number(quantity);
  const afterCheckout =
    book && Number.isInteger(qtyNumber) && qtyNumber >= 1 && qtyNumber <= book.available_copies
      ? book.available_copies - qtyNumber
      : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!book) next.book = "Choose a book.";
    const q = book ? validateQuantity(quantity, book.available_copies, "Quantity") : { value: null };
    if (book && q.error) next.quantity = q.error;
    if (name.trim().length < 2) next.name = "Enter the borrower's full name.";
    if (!type) next.type = "Choose a borrower type.";
    setErrors(next);
    if (Object.keys(next).length > 0 || !book || q.value === null || !type) return;

    setBusy(true);
    try {
      await checkoutBook({
        bookId: book.id,
        quantity: q.value,
        borrowerName: name.trim(),
        borrowerType: type,
        gradeLevelId: gradeId || null,
        sectionId: sectionId || null,
        borrowerId: null,
        remember,
      });
      onDone(`Recorded: ${q.value} × “${book.title}” to ${name.trim()}.`);
    } catch (err) {
      setErrors({ form: toMessage(err, "The checkout could not be saved. Nothing was recorded.") });
      setBusy(false);
      // Stock may have changed under us; refresh the book list.
      matches.reload();
    }
  }

  return (
    <Dialog title="Record a checkout" description="Copies are checked against live stock when you confirm." onClose={onClose} busy={busy} wide>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {errors.form ? <InlineAlert>{errors.form}</InlineAlert> : null}

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold text-ink-900">Book</legend>
          {book ? (
            <div className="flex items-start justify-between gap-3 rounded-md border border-teal-700 bg-teal-50 p-3">
              <div>
                <p className="font-semibold text-ink-900">{book.title}</p>
                <p className="text-sm text-ink-700">{book.author}</p>
                <p className="mt-1 text-sm font-semibold text-teal-800">{book.available_copies} available now</p>
              </div>
              <Button onClick={() => setBook(null)}>Change</Button>
            </div>
          ) : (
            <>
              <TextField
                label="Search title, author or ISBN"
                type="search"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                error={errors.book}
                autoFocus
              />
              <ul className="max-h-56 divide-y divide-ink-100 overflow-y-auto rounded-md border border-ink-100 bg-white" aria-label="Matching books">
                {(matches.data ?? []).map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      disabled={b.available_copies <= 0}
                      onClick={() => {
                        setBook(b);
                        setQuantity("1");
                        setErrors((cur) => ({ ...cur, book: undefined }));
                      }}
                      className="flex min-h-[52px] w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-paper-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>
                        <span className="block font-semibold text-ink-900">{b.title}</span>
                        <span className="block text-sm text-ink-700">{b.author}</span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold">{b.available_copies > 0 ? `${b.available_copies} available` : "None available"}</span>
                    </button>
                  </li>
                ))}
                {matches.data && matches.data.length === 0 ? <li className="px-3 py-3 text-sm text-ink-700">No matching books.</li> : null}
              </ul>
            </>
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Quantity"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            error={errors.quantity}
            hint={book ? (afterCheckout !== null ? `${afterCheckout} would remain available.` : `Up to ${book.available_copies}.`) : "Choose a book first."}
          />
          <SelectField label="Borrower type" value={type} onChange={(e) => setType(e.target.value as BorrowerType | "")} error={errors.type}>
            <option value="">Choose…</option>
            {(Object.keys(BORROWER_TYPE_LABELS) as BorrowerType[]).map((t) => (
              <option key={t} value={t}>
                {BORROWER_TYPE_LABELS[t]}
              </option>
            ))}
          </SelectField>
        </div>

        <div>
          <TextField
            label="Borrower full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            list="borrower-directory"
            autoComplete="off"
            maxLength={120}
          />
          <datalist id="borrower-directory">
            {(directory.data ?? []).filter((b) => b.is_active).map((b) => (
              <option key={b.id} value={b.full_name} />
            ))}
          </datalist>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Grade level" value={gradeId} onChange={(e) => setGradeId(e.target.value)} hint="Leave blank for teachers or staff.">
            <option value="">Not applicable</option>
            {activeGrades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">Not applicable</option>
            {activeSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        </div>

        <CheckboxField label="Remember this borrower for next time" checked={remember} onChange={(e) => setRemember(e.target.checked)} />

        <p className="text-sm text-ink-700">
          Issued by <strong>{profile?.full_name}</strong> at the time you confirm.
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" loading={busy}>
            Confirm checkout
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
