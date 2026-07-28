"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMarkAllReadMutation,
  useMarkReadMutation,
  useNotificationsQuery,
  useNotificationsRealtime,
  useUnreadCountQuery,
} from "@/hooks/use-notifications";
import { getErrorMessage } from "@/lib/axios";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** عدد الإشعارات المعروضة داخل القائمة المنسدلة - "عرض الكل" بالصفحة الكاملة لباقيها */
const DROPDOWN_LIMIT = 5;

export function NotificationsMenu() {
  // اتصال SSE مستمر (Infinite Refresh) طوال بقاء الهيدر مُركَّباً - أي جلسة موصولة
  useNotificationsRealtime();

  const { data: unreadCount = 0 } = useUnreadCountQuery();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useNotificationsQuery({ page: 1, limit: DROPDOWN_LIMIT });
  const notifications = data?.notifications ?? [];

  const markRead = useMarkReadMutation();
  const markAllRead = useMarkAllReadMutation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="الإشعارات">
            <Bell aria-hidden />
            {unreadCount > 0 && (
              <Badge className="absolute -top-0.5 -end-0.5 size-4 min-w-4 justify-center p-0 text-[10px]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between gap-2 px-1.5 py-1">
          <DropdownMenuLabel className="p-0">الإشعارات</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto gap-1 px-1.5 py-0.5 text-xs text-muted-foreground"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="size-3.5" aria-hidden /> تحديد الكل كمقروء
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="space-y-3 p-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : notifications.length === 0 ? (
          <EmptyState icon={Bell} title="لا توجد إشعارات" />
        ) : (
          <ul className="max-h-72 overflow-y-auto">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => !n.readAt && markRead.mutate(n.id)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2.5 text-start text-sm hover:bg-accent",
                    !n.readAt && "bg-accent/40",
                  )}
                >
                  {!n.readAt && (
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate leading-snug">{n.title}</span>
                      {n.priority === "HIGH" && (
                        <Badge variant="destructive" className="h-4 shrink-0 px-1 text-[9px]">
                          عاجل
                        </Badge>
                      )}
                    </span>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/notifications" />} className="justify-center text-primary">
          عرض الكل
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
