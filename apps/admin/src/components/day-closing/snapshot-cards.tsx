"use client";

import {
  Banknote,
  Boxes,
  CreditCard,
  Gift,
  Percent,
  PackageX,
  Receipt,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Ticket,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react";
import { MetricCard } from "@/components/cards/metric-card";
import { formatCurrency } from "@/lib/format";
import type { DayAggregations } from "@/types/day-closing";

/** شبكة بطاقات لقطة اليوم - تُستخدَم للتجميع الحيّ (وردية مفتوحة) وللقطة يوم مُغلق */
export function SnapshotCards({ snapshot }: { snapshot: DayAggregations }) {
  const num = (n: number) => n.toLocaleString("ar-EG");
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="إجمالي الإيراد" value={formatCurrency(snapshot.totalRevenue)} icon={TrendingUp} tone="success" />
      <MetricCard title="صافي المبيعات" value={formatCurrency(snapshot.netSales)} icon={TrendingUp} tone="success" />
      <MetricCard title="عدد الطلبات" value={num(snapshot.ordersCount)} icon={ShoppingCart} />
      <MetricCard title="مبيعات نقدية" value={formatCurrency(snapshot.cashSales)} icon={Banknote} />
      <MetricCard title="مبيعات بطاقة" value={formatCurrency(snapshot.cardSales)} icon={CreditCard} />
      <MetricCard title="تحويل بنكي" value={formatCurrency(snapshot.bankSales)} icon={Wallet} />
      <MetricCard title="محفظة إلكترونية" value={formatCurrency(snapshot.walletSales)} icon={Smartphone} />
      <MetricCard title="المرتجعات" value={formatCurrency(snapshot.refundsTotal)} icon={RotateCcw} tone="warning" />
      <MetricCard title="الخصومات" value={formatCurrency(snapshot.discountTotal)} icon={Percent} />
      <MetricCard title="الفواتير" value={num(snapshot.invoicesCount)} icon={Receipt} />
      <MetricCard title="الضريبة" value={formatCurrency(snapshot.taxTotal)} icon={Receipt} />
      <MetricCard title="عملاء جدد" value={num(snapshot.newCustomers)} icon={UserPlus} />
      <MetricCard title="المشتريات" value={formatCurrency(snapshot.purchasesTotal)} icon={ShoppingBag} />
      <MetricCard title="قيمة المخزون" value={formatCurrency(snapshot.inventoryValue)} icon={Boxes} />
      <MetricCard title="حركات المخزون" value={num(snapshot.inventoryMovements)} icon={Boxes} />
      <MetricCard title="كوبونات مستخدمة" value={num(snapshot.couponsUsed)} icon={Ticket} />
      <MetricCard title="نقاط مكتسبة" value={num(snapshot.pointsEarned)} icon={Gift} />
      <MetricCard title="نقاط مستبدلة" value={num(snapshot.pointsRedeemed)} icon={Gift} />
      <MetricCard
        title="تنبيهات نقص المخزون"
        value={num(snapshot.lowStockAlerts + snapshot.outOfStockAlerts)}
        icon={PackageX}
        tone={snapshot.lowStockAlerts + snapshot.outOfStockAlerts > 0 ? "warning" : "default"}
      />
    </div>
  );
}
