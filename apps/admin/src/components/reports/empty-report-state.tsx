import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface EmptyReportStateProps {
  icon: LucideIcon;
  title: string;
  hasActiveFilters: boolean;
}

/** غلاف رقيق حول EmptyState العام - رسالة موحّدة "لا نتائج مطابقة" عند وجود فلاتر نشطة أو "لا بيانات بعد" بدونها */
export function EmptyReportState({ icon, title, hasActiveFilters }: EmptyReportStateProps) {
  return (
    <div className="p-2">
      <EmptyState
        icon={icon}
        title={hasActiveFilters ? "لا توجد نتائج مطابقة" : title}
        description={hasActiveFilters ? "جرّب تعديل الفلاتر أو نطاق التاريخ" : undefined}
      />
    </div>
  );
}
