"use client";

import { CircleDollarSign, Eye, PackageCheck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeletonRows } from "@/components/tables/table-skeleton";
import { OrderStatusBadge } from "@/components/orders/status-badge";
import { PaymentStatusBadge } from "@/components/orders/payment-status-badge";
import { canMarkDelivered, isOverdue, remainingOf } from "@/lib/deliveries";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderListRow } from "@/types/orders";

interface DeliveriesTableProps {
  orders: readonly OrderListRow[];
  isLoading: boolean;
  canRecordPayment: boolean;
  canChangeStatus: boolean;
  onView: (order: OrderListRow) => void;
  onPay: (order: OrderListRow) => void;
  onDeliver: (order: OrderListRow) => void;
}

const COLUMNS = 9;

/**
 * جدول التسليمات.
 *
 * أعمدةٌ تخصّ التسليم لا نسخةٌ من جدول الطلبات: الموظّف هنا يسأل «كم المتبقّي
 * على هذا العميل؟» و«متى كان موعده؟» و«كم قطعة أسلّمها؟» — لا عن تاريخ
 * الاستلام ولا عن المجموع الفرعي. والشارات والحوارات مُعاد استخدامها كما هي.
 *
 * المتأخّر مميَّز بالنصّ «متأخّر» لا باللون وحده: القائمة تُقرأ على شاشة كاشير
 * قد تكون رديئة الإضاءة، ومن يعاني عمى الألوان لا يرى الفرق أصلاً.
 */
export function DeliveriesTable({
  orders,
  isLoading,
  canRecordPayment,
  canChangeStatus,
  onView,
  onPay,
  onDeliver,
}: DeliveriesTableProps) {
  if (!isLoading && orders.length === 0) {
    return (
      <EmptyState
        icon={PackageCheck}
        title="لا تسليمات في هذا النطاق"
        description="غيّر النطاق أو الفلاتر لعرض طلبات أخرى."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>رقم الطلب</TableHead>
            <TableHead>العميل</TableHead>
            <TableHead className="text-center">القطع</TableHead>
            <TableHead>الإجمالي</TableHead>
            <TableHead>المتبقّي</TableHead>
            <TableHead>موعد التسليم</TableHead>
            <TableHead>الفرع</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead className="text-end">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows columns={COLUMNS} />
          ) : (
            orders.map((order) => {
              const remaining = remainingOf(order);
              const overdue = isOverdue(order);
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium" dir="ltr">
                    {order.orderNumber}
                  </TableCell>

                  <TableCell>
                    <span className="block max-w-40 truncate">{order.customer.name}</span>
                    {order.customer.phone && (
                      <a
                        href={`tel:${order.customer.phone}`}
                        dir="ltr"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
                      >
                        <Phone className="size-3" aria-hidden />
                        {order.customer.phone}
                      </a>
                    )}
                  </TableCell>

                  <TableCell className="text-center">{order._count.items}</TableCell>
                  <TableCell>{formatCurrency(order.total)}</TableCell>

                  <TableCell>
                    {remaining > 0 ? (
                      <span className="font-medium text-amber-600">
                        {formatCurrency(remaining)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">مسدَّد</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <span className={cn("text-sm", overdue && "text-destructive")}>
                      {formatDateTime(order.dueDate)}
                    </span>
                    {overdue && (
                      <span className="block text-xs font-medium text-destructive">متأخّر</span>
                    )}
                  </TableCell>

                  <TableCell className="max-w-32 truncate">{order.branch.name}</TableCell>

                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <OrderStatusBadge status={order.status} />
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(order)}
                        aria-label={`عرض تفاصيل الطلب ${order.orderNumber}`}
                      >
                        <Eye aria-hidden />
                      </Button>

                      {canRecordPayment && remaining > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onPay(order)}
                          aria-label={`تسجيل دفعة على الطلب ${order.orderNumber}`}
                        >
                          <CircleDollarSign aria-hidden />
                        </Button>
                      )}

                      {canChangeStatus && canMarkDelivered(order) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onDeliver(order)}
                        >
                          <PackageCheck aria-hidden />
                          تسليم
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
