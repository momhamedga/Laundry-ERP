"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeletonRows } from "@/components/tables/table-skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import type { SortOrder } from "@/types";
import type { InvoiceListRow, InvoiceSortField } from "@/types/invoice";
import { InvoiceStatusBadge } from "./invoice-status-badge";

interface InvoicesTableProps {
  invoices: readonly InvoiceListRow[];
  isLoading: boolean;
  sortBy: InvoiceSortField;
  sortOrder: SortOrder;
  onSort: (field: InvoiceSortField) => void;
  onViewDetails: (invoice: InvoiceListRow) => void;
}

function SortIcon({ active, direction }: { active: boolean; direction: SortOrder }) {
  if (!active) return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />;
  return direction === "asc" ? (
    <ArrowUp className="size-3.5" aria-hidden />
  ) : (
    <ArrowDown className="size-3.5" aria-hidden />
  );
}

function SortableHead({
  field,
  label,
  sortBy,
  sortOrder,
  onSort,
}: {
  field: InvoiceSortField;
  label: string;
  sortBy: InvoiceSortField;
  sortOrder: SortOrder;
  onSort: (field: InvoiceSortField) => void;
}) {
  return (
    <TableHead className="text-start">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex items-center gap-1 hover:text-primary"
      >
        {label}
        <SortIcon active={sortBy === field} direction={sortOrder} />
      </button>
    </TableHead>
  );
}

export function InvoicesTable({
  invoices,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onViewDetails,
}: InvoicesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead
            field="invoiceNumber"
            label="رقم الفاتورة"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={onSort}
          />
          <TableHead className="text-start">رقم الطلب</TableHead>
          <TableHead className="text-start">العميل</TableHead>
          <TableHead className="text-start">الفرع</TableHead>
          <TableHead className="text-start">الحالة</TableHead>
          <SortableHead
            field="total"
            label="الإجمالي"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={onSort}
          />
          <TableHead className="text-start">المتبقي</TableHead>
          <SortableHead
            field="issuedAt"
            label="تاريخ الإصدار"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={onSort}
          />
          <SortableHead
            field="dueDate"
            label="تاريخ الاستحقاق"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={onSort}
          />
          <TableHead className="w-10 text-start">
            <span className="sr-only">إجراءات</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeletonRows rows={8} columns={10} />
        ) : (
          invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-mono text-xs" dir="ltr">
                <button
                  type="button"
                  onClick={() => onViewDetails(invoice)}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {invoice.invoiceNumber}
                </button>
              </TableCell>
              <TableCell className="font-mono text-xs" dir="ltr">
                {invoice.order.orderNumber}
              </TableCell>
              <TableCell className="font-medium">{invoice.customer.name}</TableCell>
              <TableCell>{invoice.branch.name}</TableCell>
              <TableCell>
                <InvoiceStatusBadge status={invoice.status} />
              </TableCell>
              <TableCell className="tabular-nums">{formatCurrency(invoice.total)}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {formatCurrency(invoice.remainingAmount)}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(invoice.issuedAt)}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(invoice.dueDate)}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`عرض تفاصيل الفاتورة ${invoice.invoiceNumber}`}
                  onClick={() => onViewDetails(invoice)}
                >
                  <Eye aria-hidden />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
