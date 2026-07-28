"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "./breadcrumbs";
import { MobileSidebar } from "./mobile-sidebar";
import { NotificationsMenu } from "./notifications-menu";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

/** هيدر اللوحة: قائمة الجوال + Breadcrumb + بحث + إشعارات + ثيم + مستخدم */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
      <MobileSidebar />
      <div className="hidden md:block">
        <Breadcrumbs />
      </div>

      <div className="ms-auto flex items-center gap-1.5">
        <div className="relative hidden sm:block">
          <Search
            className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="بحث سريع..."
            aria-label="بحث"
            className="w-48 ps-9 lg:w-64"
          />
        </div>
        <NotificationsMenu />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
