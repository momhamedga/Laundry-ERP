"use client";

import {
  Ban,
  Calendar,
  ClipboardList,
  CreditCard,
  Phone,
  RotateCcw,
  StickyNote,
  User,
  Wallet,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { usePaymentDetailQuery } from "@/hooks/use-payments";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { CancelPaymentDialog } from "./cancel-payment-dialog";
import { PaymentDetailsSkeleton } from "./payment-details-skeleton";
import { PaymentMethodBadge } from "./payment-method-badge";
import { PaymentReceiptButton } from "./payment-receipt-button";
import { PaymentTxStatusBadge } from "./payment-tx-status-badge";
import { RefundPaymentDialog } from "./refund-payment-dialog";

interface PaymentDetailsDrawerProps {
  paymentId: string | null;
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

function Row({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: React.ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={emphasized ? "font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}

/** لوحة تفاصيل الدفعة - Drawer/Side Panel + إجراءات الاسترداد/الإلغاء (يتطلب ADMIN/MANAGER) */
export function PaymentDetailsDrawer({ paymentId, open, onOpenChange }: PaymentDetailsDrawerProps) {
  const { data: payment, isLoading, isError, error, refetch } = usePaymentDetailQuery(paymentId);
  const { hasRole } = usePermissions();

  const [refundOpen, setRefundOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const remaining = payment ? Number(payment.amount) - Number(payment.refundedAmount) : 0;
  const orderRemaining = payment
    ? Number(payment.order.total) - Number(payment.order.paidAmount)
    : 0;
  const canManage = hasRole("ADMIN", "MANAGER");
  const canRefund = canManage && payment?.status === "COMPLETED";
  const canCancel = canManage && payment?.status === "PENDING";
  const canPrintReceipt = payment?.status === "COMPLETED" || payment?.status === "REFUNDED";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>
            {payment ? (
              <span dir="ltr" className="inline-block">
                {payment.reference ?? payment.id}
              </span>
            ) : (
              "تفاصيل الدفعة"
            )}
          </SheetTitle>
          {payment && (
            <SheetDescription className="flex items-center gap-2">
              <PaymentTxStatusBadge status={payment.status} />
              <PaymentMethodBadge method={payment.method} />
            </SheetDescription>
          )}
        </SheetHeader>

        {(canRefund || canCancel || canPrintReceipt) && payment && (
          <div className="flex flex-wrap items-center gap-2 px-4">
            <PaymentReceiptButton paymentId={payment.id} status={payment.status} />
            {canRefund && (
              <Button variant="outline" size="sm" onClick={() => setRefundOpen(true)}>
                <RotateCcw aria-hidden /> استرداد
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setCancelOpen(true)}
              >
                <Ban aria-hidden /> إلغاء الدفعة
              </Button>
            )}
          </div>
        )}

        {/* min-h-0 ضروري: يسمح لطفل flex بالانكماش فيعمل تمرير ScrollArea داخل العمود */}
        <ScrollArea className="min-h-0 flex-1">
          {isLoading ? (
            <PaymentDetailsSkeleton />
          ) : isError ? (
            <div className="px-4">
              <ErrorState
                title="تعذر تحميل تفاصيل الدفعة"
                description={getErrorMessage(error)}
                onRetry={() => void refetch()}
              />
            </div>
          ) : payment ? (
            <div className="space-y-5 px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow icon={ClipboardList} label="رقم الطلب" value={<span dir="ltr">{payment.order.orderNumber}</span>} />
                <InfoRow icon={User} label="العميل" value={payment.order.customer.name} />
                <InfoRow
                  icon={Phone}
                  label="هاتف العميل"
                  value={<span dir="ltr">{payment.order.customer.phone}</span>}
                />
                <InfoRow icon={User} label="استلمها" value={payment.receivedBy.name} />
                <InfoRow icon={Calendar} label="تاريخ الإنشاء" value={formatDateTime(payment.createdAt)} />
                <InfoRow icon={Calendar} label="آخر تحديث" value={formatDateTime(payment.updatedAt)} />
              </div>

              {payment.notes && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <StickyNote className="size-3.5" aria-hidden /> ملاحظات
                  </p>
                  <p className="text-sm">{payment.notes}</p>
                </div>
              )}

              <Separator />

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <CreditCard className="size-4" aria-hidden /> تفاصيل المبلغ
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                  <Row label="المبلغ" value={formatCurrency(payment.amount)} emphasized />
                  <Row label="المسترد" value={formatCurrency(payment.refundedAmount)} />
                  <Row
                    label="المتبقي القابل للاسترداد"
                    value={formatCurrency(remaining)}
                    emphasized={remaining !== Number(payment.amount)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <Wallet className="size-4" aria-hidden /> الحالة المالية للطلب
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                  <Row label="إجمالي الطلب" value={formatCurrency(payment.order.total)} />
                  <Row label="إجمالي مدفوع الطلب" value={formatCurrency(payment.order.paidAmount)} />
                  <Row
                    label="متبقي على الطلب"
                    value={formatCurrency(orderRemaining)}
                    emphasized={orderRemaining > 0}
                  />
                </CardContent>
              </Card>
            </div>
          ) : null}
        </ScrollArea>
      </SheetContent>

      <RefundPaymentDialog payment={payment ?? null} open={refundOpen} onOpenChange={setRefundOpen} />
      <CancelPaymentDialog payment={payment ?? null} open={cancelOpen} onOpenChange={setCancelOpen} />
    </Sheet>
  );
}
