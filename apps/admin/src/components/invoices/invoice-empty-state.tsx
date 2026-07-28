import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface InvoiceEmptyStateProps {
  hasActiveFilters: boolean;
}

/** غلاف رقيق حول EmptyState العام - "لا نتائج مطابقة" مع فلاتر نشطة أو "لا فواتير بعد" بدونها */
export function InvoiceEmptyState({ hasActiveFilters }: InvoiceEmptyStateProps) {
  return (
    <div className="p-2">
      <EmptyState
        icon={FileText}
        title={hasActiveFilters ? "لا توجد نتائج مطابقة" : "لا توجد فواتير بعد"}
        description={hasActiveFilters ? "جرّب تعديل الفلاتر أو البحث" : undefined}
      />
    </div>
  );
}
