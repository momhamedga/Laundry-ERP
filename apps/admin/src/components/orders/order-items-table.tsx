import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { OrderItem } from "@/types/orders";

const UNIT_LABELS: Record<OrderItem["service"]["unit"], string> = {
  PIECE: "قطعة",
  KG: "كجم",
  FIXED: "—",
};

export function OrderItemsTable({ items }: { items: readonly OrderItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-start">الخدمة</TableHead>
          <TableHead className="text-start">الكمية</TableHead>
          <TableHead className="text-start">سعر الوحدة</TableHead>
          <TableHead className="text-start">الخصم</TableHead>
          <TableHead className="text-end">الإجمالي</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">
              {item.service.name}
              {item.notes && (
                <p className="mt-0.5 text-xs font-normal text-muted-foreground">{item.notes}</p>
              )}
            </TableCell>
            <TableCell className="tabular-nums">
              {item.quantity} {UNIT_LABELS[item.service.unit]}
            </TableCell>
            <TableCell className="tabular-nums text-muted-foreground">
              {formatCurrency(item.unitPrice)}
            </TableCell>
            <TableCell className="tabular-nums text-muted-foreground">
              {Number(item.discount) > 0 ? formatCurrency(item.discount) : "—"}
            </TableCell>
            <TableCell className="text-end font-medium tabular-nums">
              {formatCurrency(item.subtotal)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
