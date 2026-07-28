"use client";

import { motion } from "framer-motion";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useUiStore } from "@/store/ui-store";
import { AppLogo } from "./app-logo";
import { LogoutButton } from "./logout-button";
import { NavLinks } from "./nav-links";

/** الشريط الجانبي - سطح المكتب فقط (الجوال عبر Sheet في الهيدر) */
export function AppSidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);

  return (
    <motion.aside
      aria-label="الشريط الجانبي"
      initial={false}
      animate={{ width: collapsed ? 68 : 248 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="sticky top-0 hidden h-dvh shrink-0 flex-col border-e bg-sidebar text-sidebar-foreground lg:flex"
    >
      <div className="flex h-16 items-center justify-between px-4">
        <AppLogo collapsed={collapsed} />
      </div>
      <Separator />

      <ScrollArea className="min-h-0 flex-1 py-3">
        <NavLinks collapsed={collapsed} />
      </ScrollArea>

      <Separator />
      <div className="flex flex-col gap-1 p-2">
        <LogoutButton collapsed={collapsed} />
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={toggle}
          aria-label={collapsed ? "توسيع الشريط الجانبي" : "طي الشريط الجانبي"}
          className="justify-center text-sidebar-foreground/60"
        >
          {collapsed ? <PanelRightOpen aria-hidden /> : <PanelRightClose aria-hidden />}
          {!collapsed && <span>طي القائمة</span>}
        </Button>
      </div>
    </motion.aside>
  );
}
