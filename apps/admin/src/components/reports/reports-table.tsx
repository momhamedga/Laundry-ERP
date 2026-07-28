"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeletonRows } from "@/components/tables/table-skeleton";
import type { SortOrder } from "@/types";

export interface ReportsTableColumn<TRow, TSortField extends string> {
  key: string;
  label: string;
  /** غيابه يعني عمود غير قابل للفرز (مطابق فقط لِـ sortBy المسموح بالخادم) */
  sortField?: TSortField;
  align?: "start" | "end";
  render: (row: TRow) => React.ReactNode;
}

interface ReportsTableProps<TRow, TSortField extends string> {
  columns: readonly ReportsTableColumn<TRow, TSortField>[];
  rows: readonly TRow[];
  rowKey: (row: TRow) => string;
  isLoading: boolean;
  sortBy: TSortField;
  sortOrder: SortOrder;
  onSort: (field: TSortField) => void;
}

function SortIcon({ active, direction }: { active: boolean; direction: SortOrder }) {
  if (!active) return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />;
  return direction === "asc" ? (
    <ArrowUp className="size-3.5" aria-hidden />
  ) : (
    <ArrowDown className="size-3.5" aria-hidden />
  );
}

/**
 * جدول تقارير عام - قابل لإعادة الاستخدام بكل الستة تقارير عبر columns
 * مُهيَّأة صراحةً لكل تقرير (بلا أعمدة/حقول مُختلَقة، كل render يقرأ حقلاً
 * حقيقياً من نوع الصف الفعلي القادم من الخادم)
 */
export function ReportsTable<TRow, TSortField extends string>({
  columns,
  rows,
  rowKey,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
}: ReportsTableProps<TRow, TSortField>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key} className={col.align === "end" ? "text-end" : "text-start"}>
              {col.sortField ? (
                <button
                  type="button"
                  onClick={() => onSort(col.sortField as TSortField)}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  {col.label}
                  <SortIcon active={sortBy === col.sortField} direction={sortOrder} />
                </button>
              ) : (
                col.label
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeletonRows rows={8} columns={columns.length} />
        ) : (
          rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={col.align === "end" ? "text-end tabular-nums" : undefined}
                >
                  {col.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
