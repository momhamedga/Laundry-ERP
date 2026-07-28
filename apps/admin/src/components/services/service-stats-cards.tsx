import { CheckCircle2, Layers, PauseCircle, Sparkles } from "lucide-react";
import { MetricCard } from "@/components/cards/metric-card";

interface ServiceStatsCardsProps {
  stats: { total: number; active: number; inactive: number; categories: number };
}

/** أرقام محسوبة من استعلامات list خفيفة (meta.total) - لا Endpoint إحصائي جديد */
export function ServiceStatsCards({ stats }: ServiceStatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="إجمالي الخدمات" value={String(stats.total)} icon={Sparkles} />
      <MetricCard title="خدمات نشطة" value={String(stats.active)} icon={CheckCircle2} tone="success" />
      <MetricCard title="خدمات معطلة" value={String(stats.inactive)} icon={PauseCircle} tone="warning" />
      <MetricCard title="عدد التصنيفات" value={String(stats.categories)} icon={Layers} />
    </div>
  );
}
