"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/constants/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

interface NavLinksProps {
  /** إخفاء النصوص في وضع الطي */
  collapsed?: boolean;
  /** يُستدعى عند اختيار رابط (لإغلاق الـ Sheet في الجوال) */
  onNavigate?: () => void;
}

/** قائمة التنقل المجمّعة في أقسام - مشتركة بين شريط سطح المكتب وSheet الجوال */
export function NavLinks({ collapsed = false, onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  const { can } = usePermissions();

  // احسب الأقسام المرئية (بعد فلترة الصلاحيات) وأخفِ القسم الفارغ بالكامل
  const groups = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <nav aria-label="التنقل الرئيسي" className="flex flex-col gap-4 px-2">
      {groups.map((group, gi) => (
        <div key={group.label} className="flex flex-col gap-1">
          {collapsed ? (
            // في وضع الطي: فاصل خفيف بدل عنوان القسم (عدا أول قسم)
            gi > 0 && <div className="mx-auto my-1 h-px w-6 bg-sidebar-border" aria-hidden />
          ) : (
            <p className="px-3 pb-1 text-[0.7rem] font-semibold tracking-wide text-sidebar-foreground/45">
              {group.label}
            </p>
          )}

          {group.items.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.title : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-ring",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2",
                )}
              >
                <item.icon className="size-4.5 shrink-0" aria-hidden />
                {!collapsed && <span className="truncate">{item.title}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
