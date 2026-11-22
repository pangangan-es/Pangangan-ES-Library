import { useEffect, useId, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/Button";

interface DialogProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  /** Prevent closing (Escape / backdrop) while a save is in progress. */
  busy?: boolean;
  wide?: boolean;
}

/**
 * Modal built on the native <dialog> element: the browser provides the focus
 * trap, inert background, and Escape handling. Focus returns to the element
 * that opened it. Mount it only while open.
 */
export function Dialog({ title, description, onClose, children, busy = false, wide = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const reduce = useReducedMotion();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
      previous?.focus?.();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose();
      }}
      className={`m-auto max-h-[92vh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-lg border border-ink-300 bg-paper-50 p-0 text-ink-900 backdrop:bg-ink-900/50 ${wide ? "max-w-2xl" : "max-w-lg"}`}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.15 }}
        className="p-5 sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-display text-xl font-semibold">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-sm text-ink-700">
                {description}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" onClick={onClose} disabled={busy} aria-label="Close dialog" className="-mr-2 -mt-1 px-3">
            Close
          </Button>
        </div>
        {children}
      </motion.div>
    </dialog>
  );
}

interface ConfirmProps {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, destructive = false, busy = false, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Dialog title={title} onClose={onCancel} busy={busy}>
      <div className="text-ink-800">{message}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
