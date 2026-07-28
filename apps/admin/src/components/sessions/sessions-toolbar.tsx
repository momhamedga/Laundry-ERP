"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SessionsToolbarProps {
  totalCount: number;
  otherCount: number;
  onLogoutAllOthers: () => void;
}

export function SessionsToolbar({ totalCount, otherCount, onLogoutAllOthers }: SessionsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {totalCount} {totalCount === 1 ? "جلسة نشطة" : "جلسات نشطة"}
      </p>
      {otherCount > 0 && (
        <Button variant="outline" size="sm" onClick={onLogoutAllOthers}>
          <LogOut aria-hidden /> تسجيل الخروج من كل الأجهزة الأخرى ({otherCount})
        </Button>
      )}
    </div>
  );
}
