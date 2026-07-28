import { formatCurrency, formatDateTime } from "@/lib/format";
import { METHOD_LABELS } from "@/components/payments/payment-method-badge";
import type { InvoicePayment } from "@/types/invoice";

interface InvoicePaymentsTimelineProps {
  payments: readonly InvoicePayment[];
}

const TX_STATUS_LABELS: Record<InvoicePayment["status"], string> = {
  PENDING: "قيد الانتظار",
  COMPLETED: "مكتملة",
  FAILED: "فشلت",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
};

/**
 * مسار زمني لأحداث الدفع بالفاتورة - مبني من قائمة المدفوعات نفسها (بنفس
 * نمط OrderTimeline). مرتّب من الأحدث للأقدم. كل دفعة = حدث بالمسار الزمني.
 */
export function InvoicePaymentsTimeline({ payments }: InvoicePaymentsTimelineProps) {
  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">لا توجد أحداث دفع بعد</p>;
  }

  return (
    <ol className="space-y-4 border-e-2 border-border ps-4">
      {payments.map((payment) => (
        <li key={payment.id} className="relative">
          <span
            className="absolute -end-[1.4rem] top-1 size-2.5 rounded-full bg-success"
            aria-hidden
          />
          <p className="text-sm font-medium">
            {formatCurrency(payment.amount)} · {METHOD_LABELS[payment.method]} ·{" "}
            {TX_STATUS_LABELS[payment.status]}
            {Number(payment.refundedAmount) > 0 && (
              <span className="text-destructive">
                {" "}
                (مسترد {formatCurrency(payment.refundedAmount)})
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            بواسطة {payment.receivedBy.name} · {formatDateTime(payment.createdAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}
