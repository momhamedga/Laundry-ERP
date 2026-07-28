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
import { cn } from "@/lib/utils";
import type { SortOrder } from "@/types";
import type { OrderListRow, OrderSortField } from "@/types/orders";
import { OrderStatusBadge } from "./status-badge";

interface OrdersTableProps {
  orders: readonly OrderListRow[];
  isLoading: boolean;
  sortBy: OrderSortField;
  sortOrder: SortOrder;
  onSort: (field: OrderSortField) => void;
  onViewDetails: (order: OrderListRow) => void;
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
  field: OrderSortField;
  label: string;
  sortBy: OrderSortField;
  sortOrder: SortOrder;
  onSort: (field: OrderSortField) => void;
}) {
  return (
    <TableHead className="text-start">
      <button type="button" onClick={() => onSort(field)} className="flex items-center gap-1 hover:text-primary">
        {label}
        <SortIcon active={sortBy === field} direction={sortOrder} />
      </button>
    </TableHead>
  );
}

/**
 * Remaining Balance = total - paidAmount - حساب عرض بسيط لكل صف (وليس حساب
 * ترقيم/إجماليات صفحة، وهو ما يُمنع فعله بالواجهة - القيم ذاتها من الخادم)
 */
function remainingBalance(total: string, paidAmount: string): number {
  return Number(total) - Number(paidAmount);
}

export function OrdersTable({
  orders,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onViewDetails,
}: OrdersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead field="orderNumber" label="رقم الطلب" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <TableHead className="text-start">العميل</TableHead>
          <TableHead className="text-start">الهاتف</TableHead>
          <TableHead className="text-start">الحالة</TableHead>
          <SortableHead field="total" label="الإجمالي" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <TableHead className="text-start">المدفوع</TableHead>
          <TableHead className="text-start">المتبقي</TableHead>
          <SortableHead
            field="receivedAt"
            label="تاريخ الاستلام"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={onSort}
          />
          <SortableHead field="dueDate" label="تاريخ التسليم" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          <TableHead className="text-start">آخر تحديث</TableHead>
          <TableHead className="w-10 text-start">
            <span className="sr-only">إجراءات</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeletonRows rows={8} columns={11} />
        ) : (
          orders.map((order) => {
            const remaining = remainingBalance(order.total, order.paidAmount);
            return (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs" dir="ltr">
                  <button
                    type="button"
                    onClick={() => onViewDetails(order)}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {order.orderNumber}
                  </button>
                </TableCell>
                <TableCell className="font-medium">{order.customer.name}</TableCell>
                <TableCell dir="ltr" className="text-start text-muted-foreground">
                  {order.customer.phone}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell className="tabular-nums">{formatCurrency(order.total)}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatCurrency(order.paidAmount)}
                </TableCell>
                <TableCell
                  className={cn("tabular-nums font-medium", remaining > 0 && "text-destructive")}
                >
                  {formatCurrency(remaining)}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(order.receivedAt)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(order.dueDate)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(order.updatedAt)}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`عرض تفاصيل الطلب ${order.orderNumber}`}
                    onClick={() => onViewDetails(order)}
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
