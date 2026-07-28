import { PackageSearch } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/orders/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { RecentOrder } from "@/types/customer";

/** آخر 10 طلبات للعميل - عرض قرائي فقط (لا إجراءات على الطلب هنا) */
export function CustomerRecentOrders({ orders }: { orders: readonly RecentOrder[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">آخر الطلبات</CardTitle>
        <CardDescription>أحدث 10 طلبات لهذا العميل</CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <EmptyState icon={PackageSearch} title="لا توجد طلبات بعد" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">رقم الطلب</TableHead>
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
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(order.receivedAt)}
                  </TableCell>
                  <TableCell className="text-end font-medium tabular-nums">
                    {formatCurrency(order.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
