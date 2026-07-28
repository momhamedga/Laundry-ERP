import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentMethodBadge } from "@/components/payments/payment-method-badge";
import { PaymentReceiptButton } from "@/components/payments/payment-receipt-button";
import { PaymentTxStatusBadge } from "@/components/payments/payment-tx-status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InvoicePayment } from "@/types/invoice";

interface InvoicePaymentsTableProps {
  payments: readonly InvoicePayment[];
}

/** جدول مدفوعات الفاتورة - يُعيد استخدام شارات payments الموجودة (لا نسخ) */
export function InvoicePaymentsTable({ payments }: InvoicePaymentsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-start">التاريخ</TableHead>
          <TableHead className="text-end">المبلغ</TableHead>
          <TableHead className="text-start">الطريقة</TableHead>
          <TableHead className="text-start">الحالة</TableHead>
          <TableHead className="text-start">المرجع</TableHead>
          <TableHead className="text-start">استلمها</TableHead>
          <TableHead className="w-10 text-start">
            <span className="sr-only">إيصال</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="text-muted-foreground">{formatDate(payment.createdAt)}</TableCell>
            <TableCell className="text-end tabular-nums">{formatCurrency(payment.amount)}</TableCell>
            <TableCell>
              <PaymentMethodBadge method={payment.method} />
            </TableCell>
            <TableCell>
              <PaymentTxStatusBadge status={payment.status} />
            </TableCell>
            <TableCell className="font-mono text-xs" dir="ltr">
              {payment.reference ?? "—"}
            </TableCell>
            <TableCell>{payment.receivedBy.name}</TableCell>
            <TableCell>
              <PaymentReceiptButton paymentId={payment.id} status={payment.status} variant="icon" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
