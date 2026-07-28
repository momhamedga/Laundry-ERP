import { OrderStatusBadge } from "@/components/orders/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import type { OrderListRow } from "@/types/orders";

/**
 * جدول آخر الطلبات في اللوحة الرئيسية - يعيد استخدام OrderStatusBadge الموحّد
 * (لا خريطة حالة محلية مكررة) ويقبل OrderListRow الحقيقي من orders.service.ts
 */
export function RecentOrdersTable({ orders }: { orders: readonly OrderListRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>آخر الطلبات</CardTitle>
        <CardDescription>أحدث الطلبات الواردة للمغسلة</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">رقم الطلب</TableHead>
              <TableHead className="text-start">العميل</TableHead>
              <TableHead className="text-start">الحالة</TableHead>
              <TableHead className="text-start">التاريخ</TableHead>
              <TableHead className="text-end">الإجمالي</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs" dir="ltr">
                  {order.orderNumber}
                </TableCell>
                <TableCell className="font-medium">{order.customer.name}</TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-muted-foreground" dir="ltr">
                  {formatDate(order.createdAt)}
                </TableCell>
                <TableCell className="text-end font-medium tabular-nums">
                  {formatCurrency(order.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
