"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_NAME_AR } from "@/constants/config";
import { useUiStore } from "@/store/ui-store";
import { AppLogo } from "./app-logo";
import { LogoutButton } from "./logout-button";
import { NavLinks } from "./nav-links";

/**
 * الشريط الجانبي للجوال - Sheet ينزلق من جهة البداية.
 * البنية flex عمودية داخل SheetContent (h-full): رأس ثابت + منطقة تنقّل تعمل
 * scroll (flex-1 min-h-0 overflow-y-auto) + تذييل ثابت. gap-0 يمنع فيض الارتفاع.
 * العرض بـvariant (data-[side=right]) ليتغلّب على w-3/4 الافتراضي - درج مريح متجاوب.
 */
export function MobileSidebar() {
  const open = useUiStore((s) => s.mobileSidebarOpen);
  const setOpen = useUiStore((s) => s.setMobileSidebarOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="فتح القائمة">
            <Menu aria-hidden />
          </Button>
        }
      />
      <SheetContent
        side="right"
        className="gap-0 p-0 data-[side=right]:w-[86vw] data-[side=right]:max-w-80"
      >
        <SheetHeader className="h-16 shrink-0 justify-center border-b px-4 pe-12">
          <SheetTitle className="sr-only">{APP_NAME_AR}</SheetTitle>
          <AppLogo />
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>

        <div className="shrink-0 border-t p-2">
          <LogoutButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}
