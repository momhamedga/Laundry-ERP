import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { OrderDetail } from "@/types/orders";
import { PaymentStatusBadge } from "./payment-status-badge";

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

/**
 * ملخص المدفوعات والإجماليات - من حقول الطلب مباشرة (total/paidAmount/discount)
 * بلا استدعاء Payments API (خارج نطاق هذه المرحلة)
 */
export function OrderSummaryCard({ order }: { order: OrderDetail }) {
  const remaining = Number(order.total) - Number(order.paidAmount);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">الملخص المالي</CardTitle>
        <PaymentStatusBadge status={order.paymentStatus} />
      </CardHeader>
      <CardContent className="divide-y">
        <Row label="المجموع الفرعي" value={formatCurrency(order.subtotal)} />
        <Row label="الخصم" value={formatCurrency(order.discount)} />
        <Row label="الإجمالي" value={formatCurrency(order.total)} emphasized />
        <Row label="المدفوع" value={formatCurrency(order.paidAmount)} />
        <Row
          label="الرصيد المتبقي"
          value={formatCurrency(remaining)}
          emphasized={remaining > 0}
        />
      </CardContent>
    </Card>
  );
}
