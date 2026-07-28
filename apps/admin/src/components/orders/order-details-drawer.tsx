"use client";

import {
  Ban,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CreditCard,
  Pencil,
  Phone,
  StickyNote,
  User,
  Workflow,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ErrorState } from "@/components/ui/error-state";
import { Separator } from "@/components/ui/separator";
import { CreatePaymentDialog } from "@/components/payments/create-payment-dialog";
import { useOrderDetailQuery } from "@/hooks/use-orders";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import { formatDate } from "@/lib/format";
import { isTerminalOrderStatus } from "@/lib/order-status";
import { CancelOrderDialog } from "./cancel-order-dialog";
import { EditOrderDialog } from "./edit-order-dialog";
import { OrderDetailsSkeleton } from "./order-details-skeleton";
import { OrderItemsTable } from "./order-items-table";
import { OrderSummaryCard } from "./order-summary-card";
import { OrderTimeline } from "./order-timeline";
import { OrderStatusBadge } from "./status-badge";
import { UpdateStatusDialog } from "./update-status-dialog";

interface OrderDetailsDrawerProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

/** لوحة تفاصيل الطلب - Drawer/Side Panel وليست صفحة مستقلة */
export function OrderDetailsDrawer({ orderId, open, onOpenChange }: OrderDetailsDrawerProps) {
  const { data: order, isLoading, isError, error, refetch } = useOrderDetailQuery(orderId);
  const { can } = usePermissions();

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const mutable = !!order && !isTerminalOrderStatus(order.status);
  const canUpdateStatus = mutable && can("orders:update-status");
  const canEdit = mutable && can("orders:create");
  const canCancel = mutable && can("orders:cancel");
  // تسجيل دفعة متاح حتى بعد DELIVERED (دفع عند الاستلام) - الخادم يرفضه فقط لطلب CANCELLED
  const canRecordPayment = !!order && order.status !== "CANCELLED" && can("payments:create");
  const showActions = canUpdateStatus || canEdit || canCancel || canRecordPayment;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{order ? order.orderNumber : "تفاصيل الطلب"}</SheetTitle>
          {order && (
            <SheetDescription className="flex items-center gap-2">
              <OrderStatusBadge status={order.status} />
            </SheetDescription>
          )}
        </SheetHeader>

        {showActions && (
          <div className="flex flex-wrap items-center gap-2 px-4">
            {canUpdateStatus && (
              <Button variant="outline" size="sm" onClick={() => setStatusDialogOpen(true)}>
                <Workflow aria-hidden /> تحديث الحالة
              </Button>
            )}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Pencil aria-hidden /> تعديل
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setCancelDialogOpen(true)}
              >
                <Ban aria-hidden /> إلغاء الطلب
              </Button>
            )}
            {canRecordPayment && (
              <Button variant="outline" size="sm" onClick={() => setPaymentDialogOpen(true)}>
                <CreditCard aria-hidden /> تسجيل دفعة
              </Button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <OrderDetailsSkeleton />
          ) : isError ? (
            <div className="px-4">
              <ErrorState
                title="تعذر تحميل تفاصيل الطلب"
                description={getErrorMessage(error)}
                onRetry={() => void refetch()}
              />
            </div>
          ) : order ? (
            <div className="space-y-5 px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow icon={User} label="العميل" value={order.customer.name} />
                <InfoRow icon={Phone} label="الهاتف" value={<span dir="ltr">{order.customer.phone}</span>} />
                <InfoRow icon={Calendar} label="تاريخ الاستلام" value={formatDate(order.receivedAt)} />
                <InfoRow icon={CalendarClock} label="تاريخ التسليم المتوقع" value={formatDate(order.dueDate)} />
                <InfoRow
                  icon={CalendarCheck}
                  label="تاريخ التسليم الفعلي"
                  value={order.deliveredAt ? formatDate(order.deliveredAt) : "—"}
                />
                <InfoRow icon={User} label="أُنشئ بواسطة" value={order.createdBy.name} />
              </div>

              {order.notes && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <StickyNote className="size-3.5" aria-hidden /> ملاحظات
                  </p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              )}

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-semibold">بنود الطلب</h3>
                <OrderItemsTable items={order.items} />
              </div>

              <OrderSummaryCard order={order} />

              <div>
                <h3 className="mb-3 text-sm font-semibold">المسار الزمني</h3>
                <OrderTimeline orderId={order.id} />
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>

      <UpdateStatusDialog
        order={order ?? null}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
      />
      <EditOrderDialog order={order ?? null} open={editDialogOpen} onOpenChange={setEditDialogOpen} />
      <CancelOrderDialog
        order={order ?? null}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
      />
      {order && (
        <CreatePaymentDialog
          order={order}
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
        />
      )}
    </Sheet>
  );
}
