"use client";

import {
  Archive,
  ArchiveRestore,
  Bell,
  CheckCheck,
  Mail,
  MailOpen,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DataPagination } from "@/components/tables/data-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useArchiveNotificationMutation,
  useBulkNotificationMutation,
  useDeleteNotificationMutation,
  useMarkAllReadMutation,
  useMarkReadMutation,
  useMarkUnreadMutation,
  useNotificationsQuery,
  useUnarchiveNotificationMutation,
} from "@/hooks/use-notifications";
import { getErrorMessage } from "@/lib/axios";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NotificationItem, NotificationStatusFilter } from "@/types/notification";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type TabValue = "all" | NotificationStatusFilter;

const TABS: { value: TabValue; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "unread", label: "غير مقروءة" },
  { value: "archived", label: "الأرشيف" },
];

export function NotificationsView() {
  const [tab, setTab] = useState<TabValue>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(20);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, error, refetch } = useNotificationsQuery({
    page,
    limit,
    search: search.trim() || undefined,
    status: tab === "all" ? undefined : tab,
  });
  const notifications = data?.notifications ?? [];

  const markRead = useMarkReadMutation();
  const markUnread = useMarkUnreadMutation();
  const markAllRead = useMarkAllReadMutation();
  const archive = useArchiveNotificationMutation();
  const unarchive = useUnarchiveNotificationMutation();
  const deleteOne = useDeleteNotificationMutation();
  const bulk = useBulkNotificationMutation();

  function changeTab(value: string): void {
    setTab(value as TabValue);
    setPage(1);
    setSelected(new Set());
  }

  function toggleSelect(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(): void {
    setSelected((prev) =>
      prev.size === notifications.length ? new Set() : new Set(notifications.map((n) => n.id)),
    );
  }

  function runBulk(action: "read" | "unread" | "archive" | "delete"): void {
    if (selected.size === 0) return;
    bulk.mutate(
      { ids: [...selected], action },
      { onSuccess: () => setSelected(new Set()) },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الإشعارات"
        actions={
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
            <CheckCheck aria-hidden /> تحديد الكل كمقروء
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search
            className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="بحث بالعنوان أو المحتوى..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="ps-9"
          />
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              تم تحديد {selected.size}
            </span>
            <Button variant="outline" size="sm" onClick={() => runBulk("read")}>
              <MailOpen aria-hidden /> قراءة
            </Button>
            <Button variant="outline" size="sm" onClick={() => runBulk("unread")}>
              <Mail aria-hidden /> غير مقروء
            </Button>
            <Button variant="outline" size="sm" onClick={() => runBulk("archive")}>
              <Archive aria-hidden /> أرشفة
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => runBulk("delete")}
            >
              <Trash2 aria-hidden /> حذف
            </Button>
          </div>
        )}
      </div>

      <Card>
        {isLoading ? (
          <CardContent className="space-y-4 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2 border-b py-3 last:border-b-0">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            ))}
          </CardContent>
        ) : isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="لا توجد إشعارات"
            description={search ? "لا نتائج مطابقة للبحث" : undefined}
          />
        ) : (
          <CardContent className="divide-y p-0">
            <div className="flex items-center gap-3 px-4 py-2">
              <Checkbox
                checked={selected.size > 0 && selected.size === notifications.length}
                onCheckedChange={toggleSelectAll}
                aria-label="تحديد الكل"
              />
              <span className="text-xs text-muted-foreground">تحديد الكل بالصفحة</span>
            </div>
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                selected={selected.has(n.id)}
                onToggleSelect={() => toggleSelect(n.id)}
                onToggleRead={() =>
                  n.readAt ? markUnread.mutate(n.id) : markRead.mutate(n.id)
                }
                onToggleArchive={() =>
                  n.archivedAt ? unarchive.mutate(n.id) : archive.mutate(n.id)
                }
                onDelete={() => deleteOne.mutate(n.id)}
              />
            ))}
          </CardContent>
        )}

        {data && data.meta.total > 0 && (
          <DataPagination
            meta={data.meta}
            onPageChange={setPage}
            onLimitChange={(v) => {
              setLimit(v);
              setPage(1);
            }}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
          />
        )}
      </Card>
    </div>
  );
}

interface NotificationRowProps {
  notification: NotificationItem;
  selected: boolean;
  onToggleSelect: () => void;
  onToggleRead: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}

function NotificationRow({
  notification: n,
  selected,
  onToggleSelect,
  onToggleRead,
  onToggleArchive,
  onDelete,
}: NotificationRowProps) {
  return (
    <div className={cn("flex items-start gap-3 px-4 py-3", !n.readAt && "bg-accent/30")}>
      <Checkbox
        checked={selected}
        onCheckedChange={onToggleSelect}
        className="mt-1"
        aria-label="تحديد الإشعار"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {!n.readAt && (
            <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          )}
          <span className="font-medium leading-snug">{n.title}</span>
          {n.priority === "HIGH" && (
            <Badge variant="destructive" className="h-4 px-1 text-[9px]">
              عاجل
            </Badge>
          )}
          <span className="ms-auto shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(n.createdAt)}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleRead}
          aria-label={n.readAt ? "تحديد كغير مقروء" : "تحديد كمقروء"}
          title={n.readAt ? "تحديد كغير مقروء" : "تحديد كمقروء"}
        >
          {n.readAt ? <Mail aria-hidden /> : <MailOpen aria-hidden />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleArchive}
          aria-label={n.archivedAt ? "إلغاء الأرشفة" : "أرشفة"}
          title={n.archivedAt ? "إلغاء الأرشفة" : "أرشفة"}
        >
          {n.archivedAt ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label="حذف"
          title="حذف"
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
    </div>
  );
}
