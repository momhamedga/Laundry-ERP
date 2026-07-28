"use client";

import { DataPagination } from "@/components/tables/data-pagination";
import type { PaginationMeta } from "@/types";

const REPORT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

interface ReportsPaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

/** إعادة استخدام DataPagination الموجود مسبقاً بخيارات حجم صفحة تطابق MAX_PAGE_SIZE=100 بالخادم - بلا منطق مكرَّر */
export function ReportsPagination({ meta, onPageChange, onLimitChange }: ReportsPaginationProps) {
  return (
    <DataPagination
      meta={meta}
      onPageChange={onPageChange}
      onLimitChange={onLimitChange}
      pageSizeOptions={REPORT_PAGE_SIZE_OPTIONS}
    />
  );
}
