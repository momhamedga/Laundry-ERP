import { WashingMachine } from "lucide-react";
import { APP_NAME_AR } from "@/constants/config";
import { cn } from "@/lib/utils";

/** شعار التطبيق - يُستخدم في الشريط الجانبي وصفحة الدخول */
export function AppLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <WashingMachine className="size-5" aria-hidden />
      </span>
      {!collapsed && (
        <span className="truncate text-base font-bold">{APP_NAME_AR}</span>
      )}
    </div>
  );
}
