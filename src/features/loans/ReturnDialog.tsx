import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { TextField } from "@/components/Fields";
import { InlineAlert } from "@/components/Feedback";
import { useAuth } from "@/features/auth/AuthProvider";
import { returnCopies } from "@/features/loans/loanService";
import { formatDateTime, pluralize } from "@/lib/format";
import { toMessage } from "@/lib/errors";
import { validateQuantity } from "@/lib/validation";
import type { LoanRow } from "@/types/domain";

interface Props {
  loan: LoanRow;
  onClose: () => void;
  onDone: (summary: string) => void;
}

export function ReturnDialog({ loan, onClose, onDone }: Props) {
  const { profile } = useAuth();
  const [quantity, setQuantity] = useState(String(loan.outstanding_qty));
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const n = Number(quantity);
  const validNow = Number.isInteger(n) && n >= 1 && n <= loan.outstanding_qty;
  const remainingAfter = validNow ? loan.outstanding_qty - n : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = validateQuantity(quantity, loan.outstanding_qty, "Quantity returned");
    if (q.error || q.value === null) {
      setError(q.error);
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      await returnCopies(loan.id, q.value);
      const left = loan.outstanding_qty - q.value;
      onDone(
        left === 0
          ? `Fully returned: “${loan.book_title}” from ${loan.borrower_name}.`
          : `Recorded ${pluralize(q.value, "copy", "copies")} back. ${left} still out.`,
      );
    } catch (err) {
      setFormError(toMessage(err, "The return could not be saved. Nothing was recorded."));
      setBusy(false);
    }
  }

  return (
    <Dialog title="Record a return" onClose={onClose} busy={busy}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError ? <InlineAlert>{formError}</InlineAlert> : null}
        <dl className="space-y-1 rounded-md bg-paper-100 p-3 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-ink-500">Book</dt><dd className="text-right font-semibold">{loan.book_title}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-500">Borrower</dt><dd className="text-right">{loan.borrower_name}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-500">Borrowed</dt><dd className="text-right">{formatDateTime(loan.borrowed_at)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-500">Borrowed / returned so far</dt><dd className="text-right">{loan.quantity} / {loan.returned_qty}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-500">Still out</dt><dd className="text-right font-semibold">{loan.outstanding_qty}</dd></div>
        </dl>
        <TextField
          label="Copies being returned now"
          inputMode="numeric"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          error={error}
          hint={remainingAfter !== null ? (remainingAfter === 0 ? "This completes the loan." : `${remainingAfter} would remain out; the loan stays open.`) : `Between 1 and ${loan.outstanding_qty}.`}
          autoFocus
        />
        <p className="text-sm text-ink-700">
          Received by <strong>{profile?.full_name}</strong> at the time you confirm.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="accent" loading={busy}>Confirm return</Button>
        </div>
      </form>
    </Dialog>
  );
}
