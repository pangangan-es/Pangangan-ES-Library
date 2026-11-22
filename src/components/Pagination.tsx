import { Button } from "@/components/Button";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPage }: Props) {
  if (total <= pageSize) return null;
  const pages = Math.ceil(total / pageSize);
  const first = page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);
  return (
    <nav aria-label="Pagination" className="no-print mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-700">
        Showing {first} to {last} of {total}
      </p>
      <div className="flex gap-2">
        <Button onClick={() => onPage(page - 1)} disabled={page === 0}>
          Previous
        </Button>
        <Button onClick={() => onPage(page + 1)} disabled={page >= pages - 1}>
          Next
        </Button>
      </div>
    </nav>
  );
}
