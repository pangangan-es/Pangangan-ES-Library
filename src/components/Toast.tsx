import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Kind = "success" | "error";
interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
}

interface ToastApi {
  notify: (kind: Kind, message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setItems((cur) => cur.filter((t) => t.id !== id)), []);
  const notify = useCallback(
    (kind: Kind, message: string) => {
      const id = nextId++;
      setItems((cur) => [...cur.slice(-2), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 9000 : 5000);
    },
    [dismiss],
  );
  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="no-print pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col items-center gap-2 sm:items-end"
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border px-4 py-3 text-sm font-medium ${
              t.kind === "success" ? "border-teal-700 bg-teal-50 text-teal-800" : "border-danger-600 bg-danger-50 text-danger-700"
            }`}
          >
            <span className="flex-1">{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} className="min-h-[32px] px-1 font-semibold underline">
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
