import type { LucideIcon } from "lucide-react";
import { MetricCard } from "@/components/cards/metric-card";

export interface ReportSummaryItem {
  key: string;
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "destructive";
}

interface ReportsSummaryCardsProps {
  items: readonly ReportSummaryItem[];
}

/**
 * بطاقات ملخص عامة قابلة لإعادة الاستخدام بكل تقارير Reports - تعرض فقط
 * الأرقام الجاهزة من استجابة الخادم (summary الحقيقي، أو meta.total إن لم
 * يوجد summary لتقرير معيّن) بلا أي حساب بالواجهة
 */
export function ReportsSummaryCards({ items }: ReportsSummaryCardsProps) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <MetricCard
          key={item.key}
          title={item.title}
          value={item.value}
          icon={item.icon}
          tone={item.tone}
        />
      ))}
    </div>
  );
}
