import { MonitorCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** يُعرض فقط على صف الجلسة الحالية (session.current === true) */
export function CurrentSessionBadge() {
  return (
    <Badge className="border-transparent bg-primary/10 text-primary">
      <MonitorCheck aria-hidden /> هذا الجهاز
    </Badge>
  );
}
