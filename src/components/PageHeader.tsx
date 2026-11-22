import type { ReactNode } from "react";

export function PageHeader({ title, intro, action }: { title: string; intro?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">{title}</h1>
        {intro ? <p className="mt-1 max-w-2xl text-ink-700">{intro}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
