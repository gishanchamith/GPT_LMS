import type { PaginationMeta } from '@/types/api';
import { Button } from './ui';

interface PaginationProps {
  meta: PaginationMeta | null;
  onPageChange: (page: number) => void;
}

export default function Pagination({ meta, onPageChange }: PaginationProps) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages, total } = meta;

  return (
    <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Pagination">
      <p className="text-sm text-slate-600">
        Page <span className="font-medium">{page}</span> of {totalPages} · {total} total
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
