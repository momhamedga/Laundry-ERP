"use client";

import { LogOut, Monitor, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { parseUserAgent } from "@/lib/session-utils";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SessionInfo } from "@/types/session";
import { CurrentSessionBadge } from "./current-session-badge";
import { SessionStatusBadge } from "./session-status-badge";

interface SessionRowProps {
  session: SessionInfo;
  onLogoutCurrent: () => void;
  onLogoutSession: (session: SessionInfo) => void;
}

const DEVICE_ICONS = { Desktop: Monitor, Mobile: Smartphone, Tablet: Tablet, Unknown: Monitor };

export function SessionRow({ session, onLogoutCurrent, onLogoutSession }: SessionRowProps) {
  const parsed = parseUserAgent(session.userAgent);
  const DeviceIcon = DEVICE_ICONS[parsed.device];

  return (
    <TableRow className={cn(session.current && "bg-primary/5")}>
      <TableCell>
        <div className="flex items-center gap-2">
          <DeviceIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p className="font-medium">{parsed.browser}</p>
            <p className="text-xs text-muted-foreground">
              {parsed.os} · {parsed.device === "Unknown" ? "جهاز غير معروف" : parsed.device}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell dir="ltr" className="text-start text-muted-foreground">
        {session.ipAddress ?? "—"}
      </TableCell>
      <TableCell>
        <SessionStatusBadge />
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDateTime(session.createdAt)}</TableCell>
      <TableCell className="text-muted-foreground">{formatDateTime(session.expiresAt)}</TableCell>
      <TableCell>{session.current && <CurrentSessionBadge />}</TableCell>
      <TableCell>
        {/*
          الجلسة الحالية: لا تُستخدم DELETE /auth/sessions العامة (الخادم لا يمنعها
          صراحة، لكن استدعاءها هنا كان سيُبطل الجلسة بالخادم بينما تبقى حالة
          auth-store المحلية معتقدة أن المستخدم لا يزال مسجَّلاً - Desync حقيقي).
          البديل الصحيح: useLogout() الموجود مسبقاً (POST /auth/logout الحقيقي +
          تنظيف الحالة المحلية + التوجيه) - نفس ما يفعله زر "تسجيل الخروج" بالهيدر.
        */}
        {session.current ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onLogoutCurrent}
            aria-label="تسجيل الخروج من هذا الجهاز"
          >
            <LogOut aria-hidden /> تسجيل الخروج من هذا الجهاز
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onLogoutSession(session)}
            aria-label="تسجيل الخروج من هذه الجلسة"
          >
            <LogOut aria-hidden /> تسجيل الخروج
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
