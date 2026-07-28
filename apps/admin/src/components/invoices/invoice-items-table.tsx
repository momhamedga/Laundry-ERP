import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { InvoiceItem } from "@/types/invoice";

interface InvoiceItemsTableProps {
  items: readonly InvoiceItem[];
}

/** بنود الفاتورة - لقطة (Snapshot) للقراءة فقط، لا تعديل (لا Endpoint لذلك بالخادم) */
export function InvoiceItemsTable({ items }: InvoiceItemsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-start">الخدمة</TableHead>
          <TableHead className="text-end">الكمية</TableHead>
          <TableHead className="text-end">سعر الوحدة</TableHead>
          <TableHead className="text-end">الإجمالي</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.serviceNameSnapshot}</TableCell>
            <TableCell className="text-end tabular-nums">{Number(item.quantity)}</TableCell>
            <TableCell className="text-end tabular-nums">{formatCurrency(item.unitPrice)}</TableCell>
            <TableCell className="text-end tabular-nums">{formatCurrency(item.total)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
