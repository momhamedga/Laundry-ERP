import { DollarSign, HandCoins, Receipt, Wallet } from "lucide-react";
import { MetricCard } from "@/components/cards/metric-card";
import { formatCurrency } from "@/lib/format";

interface InvoicePaymentSummaryCardProps {
  total: string;
  paid: string;
  remaining: string;
  paymentCount: number;
}

/** بطاقات ملخص الدفع للفاتورة - Total/Paid/Remaining/Count (أرقام حقيقية من الخادم، لا حساب وهمي) */
export function InvoicePaymentSummaryCard({
  total,
  paid,
  remaining,
  paymentCount,
}: InvoicePaymentSummaryCardProps) {
  const hasRemaining = Number(remaining) > 0;
  return (
    // عمودان فقط (2×2) عمداً: هذه البطاقات تعيش داخل Drawer ضيّق (max-w-lg)،
    // فـ4 أعمدة كانت تحشر المحتوى وتقصّه. الشبكة تعتمد على عرض الشاشة لا الحاوية.
    <div className="grid grid-cols-2 gap-3">
      <MetricCard title="الإجمالي" value={formatCurrency(total)} icon={Receipt} />
      <MetricCard title="المدفوع" value={formatCurrency(paid)} icon={HandCoins} tone="success" />
      <MetricCard
        title="المتبقّي"
        value={formatCurrency(remaining)}
        icon={Wallet}
        tone={hasRemaining ? "warning" : "default"}
      />
      <MetricCard title="عدد الدفعات" value={String(paymentCount)} icon={DollarSign} />
    </div>
  );
}
