"use client";

import {
  Building2,
  Calendar,
  ClipboardList,
  Clock,
  CreditCard,
  DollarSign,
  Phone,
  Plus,
  StickyNote,
  User,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoicePaymentsQuery, useInvoiceQuery } from "@/hooks/use-invoices";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { InvoiceActions } from "./invoice-actions";
import { InvoiceErrorState } from "./invoice-error-state";
import { InvoiceItemsTable } from "./invoice-items-table";
import { InvoicePaymentSummaryCard } from "./invoice-payment-summary-card";
import { InvoicePaymentsTable } from "./invoice-payments-table";
import { InvoicePaymentsTimeline } from "./invoice-payments-timeline";
import { InvoiceSkeleton } from "./invoice-skeleton";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { ReceivePaymentDialog } from "./receive-payment-dialog";

interface InvoiceDetailsDrawerProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENTS_PARAMS = { page: 1, limit: 50, sortBy: "createdAt", sortOrder: "desc" } as const;

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

/** لوحة تفاصيل الفاتورة - Drawer/Side Panel، بنفس نمط PaymentDetailsDrawer حرفياً */
export function InvoiceDetailsDrawer({ invoiceId, open, onOpenChange }: InvoiceDetailsDrawerProps) {
  const { data: invoice, isLoading, isError, error, refetch } = useInvoiceQuery(invoiceId);
  const paymentsQuery = useInvoicePaymentsQuery(invoiceId ?? "", PAYMENTS_PARAMS);
  const { can } = usePermissions();
  const [receiveOpen, setReceiveOpen] = useState(false);

  const payments = paymentsQuery.data?.payments ?? [];
  const paymentCount = paymentsQuery.data?.meta.total ?? 0;
  const canReceivePayment =
    !!invoice &&
    can("payments:create") &&
    invoice.status !== "CANCELLED" &&
    Number(invoice.remainingAmount) > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
      >
        <SheetHeader>
          {/* رقم الفاتورة LTR داخل span معزول - يبقى العنوان محاذى لليمين فلا يتصادم مع زر الإغلاق يسار */}
          <SheetTitle>
            {invoice ? (
              <span dir="ltr" className="inline-block">
                {invoice.invoiceNumber}
              </span>
            ) : (
              "تفاصيل الفاتورة"
            )}
          </SheetTitle>
          {invoice && (
            <SheetDescription className="flex items-center gap-2">
              <InvoiceStatusBadge status={invoice.status} />
            </SheetDescription>
          )}
        </SheetHeader>

        {invoice && (
          <div className="px-4">
            <InvoiceActions invoice={invoice} />
          </div>
        )}

        {/* min-h-0 ضروري: يسمح لطفل flex بالانكماش فيعمل تمرير ScrollArea داخل العمود */}
        <ScrollArea className="min-h-0 flex-1">
          {isLoading ? (
            <InvoiceSkeleton variant="details" />
          ) : isError ? (
            <div className="px-4">
              <InvoiceErrorState error={error} onRetry={() => void refetch()} />
            </div>
          ) : invoice ? (
            <div className="space-y-5 px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow
                  icon={ClipboardList}
                  label="رقم الطلب"
                  value={<span dir="ltr">{invoice.order.orderNumber}</span>}
                />
                <InfoRow icon={Building2} label="الفرع" value={invoice.branch.name} />
                <InfoRow icon={User} label="العميل" value={invoice.customer.name} />
                <InfoRow
                  icon={Phone}
                  label="هاتف العميل"
                  value={<span dir="ltr">{invoice.customer.phone}</span>}
                />
                <InfoRow icon={Calendar} label="تاريخ الإصدار" value={formatDate(invoice.issuedAt)} />
                <InfoRow icon={Calendar} label="تاريخ الاستحقاق" value={formatDate(invoice.dueDate)} />
                <InfoRow icon={User} label="أصدرها" value={invoice.createdBy.name} />
                {invoice.updatedBy && (
                  <InfoRow icon={User} label="آخر تعديل بواسطة" value={invoice.updatedBy.name} />
                )}
              </div>

              {invoice.notes && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <StickyNote className="size-3.5" aria-hidden /> ملاحظات
                  </p>
                  <p className="text-sm">{invoice.notes}</p>
                </div>
              )}

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-medium">بنود الفاتورة</h3>
                <div className="overflow-x-auto rounded-lg border">
                  <InvoiceItemsTable items={invoice.items} />
                </div>
              </div>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <DollarSign className="size-4" aria-hidden /> الملخص المالي
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                  <Row label="المجموع الفرعي" value={formatCurrency(invoice.subtotal)} />
                  <Row label="الخصم" value={`-${formatCurrency(invoice.discount)}`} />
                  <Row label="الضريبة" value={formatCurrency(invoice.tax)} />
                  <Row label="الإجمالي" value={formatCurrency(invoice.total)} emphasized />
                  <Row label="المدفوع" value={formatCurrency(invoice.paidAmount)} />
                  <Row
                    label="المتبقي"
                    value={formatCurrency(invoice.remainingAmount)}
                    emphasized={Number(invoice.remainingAmount) > 0}
                  />
                </CardContent>
              </Card>

              <Separator />

              {/* ملخص الدفع - أرقام حيّة من الخادم */}
              <InvoicePaymentSummaryCard
                total={invoice.total}
                paid={invoice.paidAmount}
                remaining={invoice.remainingAmount}
                paymentCount={paymentCount}
              />

              {/* المدفوعات + زر تسجيل دفعة */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-sm font-medium">
                    <CreditCard className="size-4" aria-hidden /> المدفوعات
                  </h3>
                  {canReceivePayment && (
                    <Button size="sm" onClick={() => setReceiveOpen(true)}>
                      <Plus aria-hidden /> تسجيل دفعة
                    </Button>
                  )}
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  {paymentsQuery.isLoading ? (
                    <div className="space-y-2 p-3">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  ) : payments.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      لا توجد مدفوعات على هذه الفاتورة بعد
                    </p>
                  ) : (
                    <InvoicePaymentsTable payments={payments} />
                  )}
                </div>
              </div>

              {/* المسار الزمني لأحداث الدفع */}
              {payments.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                    <Clock className="size-4" aria-hidden /> المسار الزمني للدفع
                  </h3>
                  <InvoicePaymentsTimeline payments={payments} />
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                أُنشئت {formatDateTime(invoice.createdAt)} · آخر تحديث {formatDateTime(invoice.updatedAt)}
              </p>
            </div>
          ) : null}
        </ScrollArea>
      </SheetContent>

      {invoice && (
        <ReceivePaymentDialog
          invoiceId={invoice.id}
          orderId={invoice.order.id}
          remaining={invoice.remainingAmount}
          open={receiveOpen}
          onOpenChange={setReceiveOpen}
        />
      )}
    </Sheet>
  );
}
