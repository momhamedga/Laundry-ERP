"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportDropdown } from "@/components/reports/export-dropdown";

const REPORTS: { type: Parameters<typeof ExportDropdown>[0]["type"]; label: string }[] = [
  { type: "loyalty-top-customers", label: "أفضل العملاء" },
  { type: "loyalty-points-balance", label: "أرصدة النقاط" },
  { type: "loyalty-points-history", label: "سجل النقاط" },
  { type: "loyalty-expired-points", label: "النقاط المنتهية" },
  { type: "loyalty-referral", label: "الإحالات" },
  { type: "coupon-usage", label: "استخدام الكوبونات" },
  { type: "coupon-performance", label: "أداء الكوبونات" },
  { type: "membership-distribution", label: "توزيع العضوية" },
];

export function LoyaltyReportsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>تقارير الولاء والكوبونات والعضوية</CardTitle>
        <CardDescription>تصدير CSV / Excel / PDF / طباعة عبر محرك التصدير الموحّد</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {REPORTS.map((r) => (
            <div key={r.type} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5">
              <span className="text-sm font-medium">{r.label}</span>
              <ExportDropdown type={r.type} filters={{}} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
