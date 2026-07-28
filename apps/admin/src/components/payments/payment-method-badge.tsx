import { Badge } from "@/components/ui/badge";
import type { PaymentMethod } from "@/types/payment";

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "نقدي",
  CARD: "بطاقة",
  BANK_TRANSFER: "تحويل بنكي",
  MOBILE_WALLET: "محفظة إلكترونية",
};

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  return <Badge variant="outline">{METHOD_LABELS[method]}</Badge>;
}
