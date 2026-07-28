"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaginationMeta } from "@/types";

interface DataPaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: readonly number[];
}

/** ترقيم صفحات عام يعتمد على meta من الخادم - قابل لإعادة الاستخدام لأي قائمة */
export function DataPagination({
  meta,
  onPageChange,
  onLimitChange,
  pageSizeOptions,
}: DataPaginationProps) {
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-3 text-sm">
      <p className="text-muted-foreground" aria-live="polite">
        عرض {from}–{to} من {meta.total}
      </p>
      <div className="flex items-center gap-3">
        {onLimitChange && pageSizeOptions && (
          <Select
            value={String(meta.limit)}
            onValueChange={(v) => onLimitChange(Number(v))}
          >
            <SelectTrigger size="sm" className="w-20" aria-label="عدد الصفوف بالصفحة">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-1">
          {/* RTL: التالي = يسار، السابق = يمين */}
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!meta.hasPrev}
            onClick={() => onPageChange(meta.page - 1)}
            aria-label="الصفحة السابقة"
          >
            <ChevronRight aria-hidden />
          </Button>
          <span className="min-w-16 text-center tabular-nums">
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!meta.hasNext}
            onClick={() => onPageChange(meta.page + 1)}
            aria-label="الصفحة التالية"
          >
            <ChevronLeft aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
