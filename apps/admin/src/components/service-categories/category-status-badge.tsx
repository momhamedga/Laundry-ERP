import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function CategoryStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      className={cn(
        "border-transparent",
        isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
      )}
    >
      {isActive ? "نشط" : "معطل"}
    </Badge>
  );
}
