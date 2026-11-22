import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/Fields";
import { InlineAlert } from "@/components/Feedback";
import { createBook, updateBook } from "@/features/books/bookService";
import { toMessage } from "@/lib/errors";
import { emptyToNull, parseWholeNumber } from "@/lib/validation";
import type { Category, InventoryBook } from "@/types/domain";

interface Props {
  book: InventoryBook | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

type Errors = Partial<Record<"title" | "author" | "copies" | "isbn" | "form", string>>;

export function BookDialog({ book, categories, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [isbn, setIsbn] = useState(book?.isbn ?? "");
  const [categoryId, setCategoryId] = useState(book?.category_id ?? "");
  const [shelf, setShelf] = useState(book?.shelf_location ?? "");
  const [description, setDescription] = useState(book?.description ?? "");
  const [copies, setCopies] = useState(String(book?.total_copies ?? 1));
  const [isFeatured, setIsFeatured] = useState(book?.is_featured ?? false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const onLoan = book?.on_loan ?? 0;
  // Offer active categories, plus the book's current one even if since deactivated.
  const options = categories.filter((c) => c.is_active || c.id === book?.category_id);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!title.trim()) next.title = "Enter the book title.";
    if (!author.trim()) next.author = "Enter the author.";
    const n = parseWholeNumber(copies);
    if (n === null) next.copies = "Enter a whole number of copies (0 or more).";
    else if (n < onLoan) next.copies = `${onLoan} ${onLoan === 1 ? "copy is" : "copies are"} currently on loan, so the total cannot be lower than ${onLoan}.`;
    else if (n > 100000) next.copies = "That number is too large.";
    setErrors(next);
    if (Object.keys(next).length > 0 || n === null) return;

    const input = {
      title: title.trim(),
      author: author.trim(),
      isbn: emptyToNull(isbn),
      category_id: categoryId || null,
      shelf_location: emptyToNull(shelf),
      description: emptyToNull(description),
      total_copies: n,
      is_featured: isFeatured,
    };
    setBusy(true);
    try {
      if (book) await updateBook(book.id, input);
      else await createBook(input);
      onSaved(book ? `Saved changes to “${input.title}”.` : `Added “${input.title}”.`);
    } catch (err) {
      const message = toMessage(err, "The book could not be saved.");
      setErrors({ form: /already exists/i.test(message) ? "A book with this title and author already exists." : message });
      setBusy(false);
    }
  }

  return (
    <Dialog title={book ? "Edit book" : "Add a book"} onClose={onClose} busy={busy} wide>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {errors.form ? <InlineAlert>{errors.form}</InlineAlert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} maxLength={250} autoFocus />
          <TextField label="Author" value={author} onChange={(e) => setAuthor(e.target.value)} error={errors.author} maxLength={200} />
          <TextField label="Total copies" inputMode="numeric" value={copies} onChange={(e) => setCopies(e.target.value)} error={errors.copies} hint={onLoan > 0 ? `${onLoan} currently on loan.` : undefined} />
          <SelectField label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">No category</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.is_active ? "" : " (inactive)"}
              </option>
            ))}
          </SelectField>
          <TextField label="ISBN (optional)" value={isbn} onChange={(e) => setIsbn(e.target.value)} maxLength={32} />
          <TextField label="Shelf location (optional)" value={shelf} onChange={(e) => setShelf(e.target.value)} maxLength={80} />
        </div>
        <TextAreaField label="Description (optional)" hint="Shown publicly in the catalog." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />

        <div className="rounded-xl border border-gold-200 bg-gold-50/60 p-3">
          <CheckboxField
            label="Mark as Featured Book / Librarian's Pick of the Week"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
          />
          <p className="mt-1 pl-6 text-xs text-ink-600">
            Featured books appear prominently in the homepage spotlight and 3D reading showcase.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" loading={busy}>{book ? "Save changes" : "Add book"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
