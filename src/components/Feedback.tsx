import type { ReactNode } from "react";
import { Button } from "@/components/Button";

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-ink-700" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-700 border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-ink-300 bg-white px-4 py-10 text-center">
      <h3 className="font-display text-lg font-semibold text-ink-900">{title}</h3>
      {children ? <p className="mx-auto mt-1 max-w-md text-ink-700">{children}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-danger-600 bg-danger-50 px-4 py-6 text-center text-danger-700">
      <p className="font-medium">{message}</p>
      {onRetry ? (
        <Button className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function InlineAlert({ kind = "error", children }: { kind?: "error" | "info" | "success" | "warn"; children: ReactNode }) {
  const styles = {
    error: "border-danger-600 bg-danger-50 text-danger-700",
    info: "border-ink-300 bg-ink-50 text-ink-800",
    success: "border-teal-700 bg-teal-50 text-teal-800",
    warn: "border-warn-700 bg-warn-50 text-warn-700",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-sm font-medium ${styles}`}>
      {children}
    </div>
  );
}

type Tone = "good" | "warn" | "bad" | "neutral";
const TONES: Record<Tone, string> = {
  good: "bg-teal-100 text-teal-800 border-teal-600",
  warn: "bg-warn-50 text-warn-700 border-warn-700",
  bad: "bg-danger-50 text-danger-700 border-danger-600",
  neutral: "bg-ink-50 text-ink-800 border-ink-300",
};

/** Always pairs a colour with text, so status never relies on colour alone. */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}
