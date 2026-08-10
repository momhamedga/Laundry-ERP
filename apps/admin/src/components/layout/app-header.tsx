"use client";

import { Breadcrumbs } from "./breadcrumbs";
import { MobileSidebar } from "./mobile-sidebar";
import { NotificationsMenu } from "./notifications-menu";
import { QuickSearch } from "./quick-search";
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
        <QuickSearch />
        <NotificationsMenu />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
