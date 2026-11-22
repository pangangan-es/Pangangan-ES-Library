import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { TextField } from "@/components/Fields";
import { InlineAlert } from "@/components/Feedback";
import { toMessage } from "@/lib/errors";

interface Props {
  title: string;
  label: string;
  initialName?: string;
  submitLabel: string;
  maxLength?: number;
  /** Additional controls (their state is held by the caller). */
  extra?: ReactNode;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}

/** Add/rename dialog shared by categories, grade levels and sections. */
export function NameDialog({ title, label, initialName = "", submitLabel, maxLength = 80, extra, onSubmit, onClose }: Props) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(`Enter a ${label.toLowerCase()}.`);
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      await onSubmit(name.trim());
    } catch (err) {
      setFormError(toMessage(err, "That could not be saved."));
      setBusy(false);
    }
  }

  return (
    <Dialog title={title} onClose={onClose} busy={busy}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError ? <InlineAlert>{formError}</InlineAlert> : null}
        <TextField label={label} value={name} onChange={(e) => setName(e.target.value)} error={error} maxLength={maxLength} autoFocus />
        {extra}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" loading={busy}>{submitLabel}</Button>
        </div>
      </form>
    </Dialog>
  );
}
