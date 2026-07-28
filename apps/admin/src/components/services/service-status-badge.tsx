import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Service } from "@/types/service";

/**
 * Business Rules:
 * - الخدمة المعطلة تُعرض بوضوح (isActive=false)
 * - عند تعطيل التصنيف تظهر خدماته كغير متاحة (available=false رغم isActive=true)
 */
export function ServiceStatusBadge({
  service,
}: {
  service: Pick<Service, "isActive" | "available">;
}) {
  if (!service.isActive) {
    return (
      <Badge className={cn("border-transparent bg-muted text-muted-foreground")}>معطلة</Badge>
    );
  }
  if (!service.available) {
    return (
      <Badge className="border-transparent bg-warning/15 text-warning-foreground dark:text-warning">
        غير متاحة (تصنيف معطل)
      </Badge>
    );
  }
  return <Badge className="border-transparent bg-success/15 text-success">متاحة</Badge>;
}
