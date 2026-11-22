import type { ReactNode } from "react";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /** Hide this column's label/value from the mobile card (e.g. when the card title already shows it). */
  hideOnCard?: boolean;
  className?: string;
}

interface Props<T> {
  caption: string;
  rows: T[];
  rowKey: (row: T) => string;
  columns: Column<T>[];
  /** Mobile card heading. Defaults to the first column. */
  cardTitle?: (row: T) => ReactNode;
  /** Actions shown at the bottom of each mobile card and in the last table column. */
  actions?: (row: T) => ReactNode;
}

/** Table on wide screens, stacked cards on phones. Never relies on horizontal scrolling. */
export function ResponsiveList<T>({ caption, rows, rowKey, columns, cardTitle, actions }: Props<T>) {
  const [first, ...rest] = columns;
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-ink-100 bg-white md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-paper-100 text-ink-800">
            <tr>
              {columns.map((c) => (
                <th key={c.header} scope="col" className="px-4 py-3 font-semibold">
                  {c.header}
                </th>
              ))}
              {actions ? (
                <th scope="col" className="px-4 py-3 font-semibold">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-t border-ink-100 align-top">
                {columns.map((c) => (
                  <td key={c.header} className={`px-4 py-3 ${c.className ?? ""}`}>
                    {c.cell(row)}
                  </td>
                ))}
                {actions ? <td className="px-4 py-3"><div className="flex flex-wrap gap-2">{actions(row)}</div></td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-lg border border-ink-100 bg-white p-4">
            <div className="font-semibold text-ink-900">{cardTitle ? cardTitle(row) : first?.cell(row)}</div>
            <dl className="mt-2 space-y-1 text-sm">
              {(cardTitle ? columns : rest)
                .filter((c) => !c.hideOnCard)
                .map((c) => (
                  <div key={c.header} className="flex justify-between gap-4">
                    <dt className="text-ink-500">{c.header}</dt>
                    <dd className="text-right text-ink-900">{c.cell(row)}</dd>
                  </div>
                ))}
            </dl>
            {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions(row)}</div> : null}
          </li>
        ))}
      </ul>
    </>
  );
}
