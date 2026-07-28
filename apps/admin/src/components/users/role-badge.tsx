import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "مدير عام",
  MANAGER: "مدير فرع",
  CASHIER: "كاشير",
  WORKER: "عامل غسيل",
  DELIVERY: "مندوب توصيل",
};

const ROLE_CLASSNAMES: Record<UserRole, string> = {
  ADMIN: "bg-primary/10 text-primary",
  MANAGER: "bg-accent text-accent-foreground",
  CASHIER: "bg-success/15 text-success",
  WORKER: "bg-warning/15 text-warning-foreground dark:text-warning",
  DELIVERY: "bg-muted text-muted-foreground",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge className={cn("border-transparent", ROLE_CLASSNAMES[role])}>{ROLE_LABELS[role]}</Badge>;
}
