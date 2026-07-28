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
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SortOrder } from "@/types";
import type { Payment, PaymentSortField } from "@/types/payment";
import { PaymentMethodBadge } from "./payment-method-badge";
import { PaymentTxStatusBadge } from "./payment-tx-status-badge";

interface PaymentsTableProps {
  payments: readonly Payment[];
  isLoading: boolean;
  sortBy: PaymentSortField;
  sortOrder: SortOrder;
  onSort: (field: PaymentSortField) => void;
  onViewDetails: (payment: Payment) => void;
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
  field: PaymentSortField;
  label: string;
  sortBy: PaymentSortField;
  sortOrder: SortOrder;
  onSort: (field: PaymentSortField) => void;
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

/** Remaining = amount - refundedAmount - حساب عرض بسيط لكل صف، القيم ذاتها من الخادم */
function remainingAmount(amount: string, refundedAmount: string): number {
  return Number(amount) - Number(refundedAmount);
}

/** المتبقي على الطلب ككل (total - paidAmount) - من payment.order المُضمَّن أصلاً بالاستجابة */
function orderRemaining(total: string, paidAmount: string): number {
  return Number(total) - Number(paidAmount);
}

export function PaymentsTable({
  payments,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onViewDetails,
}: PaymentsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-start">المرجع</TableHead>
          <TableHead className="text-start">رقم الطلب</TableHead>
          <TableHead className="text-start">العميل</TableHead>
          <TableHead className="text-start">الطريقة</TableHead>
          <TableHead className="text-start">الحالة</TableHead>
          <SortableHead
            field="amount"
            label="المبلغ"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={onSort}
          />
          <TableHead className="text-start">متبقي الدفعة</TableHead>
          <TableHead className="text-start">مدفوع الطلب</TableHead>
          <TableHead className="text-start">متبقي الطلب</TableHead>
          <SortableHead
            field="createdAt"
            label="تاريخ الإنشاء"
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
          <TableSkeletonRows rows={8} columns={11} />
        ) : (
          payments.map((payment) => {
            const remaining = remainingAmount(payment.amount, payment.refundedAmount);
            const orderPaid = Number(payment.order.paidAmount);
            const orderLeft = orderRemaining(payment.order.total, payment.order.paidAmount);
            return (
              <TableRow key={payment.id}>
                <TableCell className="font-mono text-xs" dir="ltr">
                  <button
                    type="button"
                    onClick={() => onViewDetails(payment)}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {payment.reference ?? payment.id.slice(0, 10)}
                  </button>
                </TableCell>
                <TableCell className="font-mono text-xs" dir="ltr">
                  {payment.order.orderNumber}
                </TableCell>
                <TableCell className="font-medium">{payment.order.customer.name}</TableCell>
                <TableCell>
                  <PaymentMethodBadge method={payment.method} />
                </TableCell>
                <TableCell>
                  <PaymentTxStatusBadge status={payment.status} />
                </TableCell>
                <TableCell className="tabular-nums">{formatCurrency(payment.amount)}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatCurrency(remaining)}
                </TableCell>
                <TableCell className="tabular-nums text-success">
                  {formatCurrency(orderPaid)}
                </TableCell>
                <TableCell
                  className={cn("tabular-nums font-medium", orderLeft > 0 && "text-destructive")}
                >
                  {formatCurrency(orderLeft)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(payment.createdAt)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`عرض تفاصيل الدفعة ${payment.reference ?? payment.id}`}
                    onClick={() => onViewDetails(payment)}
                  >
                    <Eye aria-hidden />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
