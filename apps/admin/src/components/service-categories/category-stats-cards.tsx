import { CheckCircle2, Layers, PauseCircle } from "lucide-react";
import { MetricCard } from "@/components/cards/metric-card";

interface CategoryStatsCardsProps {
  stats: { total: number; active: number; inactive: number };
}

/** أرقام محسوبة من استعلامات list خفيفة (meta.total) - لا Endpoint إحصائي جديد */
export function CategoryStatsCards({ stats }: CategoryStatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <MetricCard title="إجمالي التصنيفات" value={String(stats.total)} icon={Layers} />
      <MetricCard title="تصنيفات نشطة" value={String(stats.active)} icon={CheckCircle2} tone="success" />
      <MetricCard title="تصنيفات معطلة" value={String(stats.inactive)} icon={PauseCircle} tone="warning" />
    </div>
  );
}
