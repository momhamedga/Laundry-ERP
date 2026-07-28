"use client";

import { Download, FileSpreadsheet, FileText, Printer, Search } from "lucide-react";
import { useState } from "react";
import { DataPagination } from "@/components/tables/data-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNotificationsQuery } from "@/hooks/use-notifications";
import { getErrorMessage } from "@/lib/axios";
import { formatRelativeTime } from "@/lib/format";
import type {
  NotificationChannel,
  NotificationPriority,
  NotificationStatusFilter,
} from "@/types/notification";

const ANY = "any";

const PRIORITY_LABELS: Record<NotificationPriority, string> = {
  LOW: "منخفضة",
  NORMAL: "عادية",
  HIGH: "عاجلة",
};

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  IN_APP: "التطبيق",
  EMAIL: "البريد",
  SMS: "SMS",
  WHATSAPP: "واتساب",
  PUSH: "Push",
};

const STATUS_LABELS: Record<NotificationStatusFilter, string> = {
  unread: "غير مقروءة",
  read: "مقروءة",
  archived: "مؤرشفة",
};

/**
 * سجل بحث/تصفية للإشعارات - نفس Endpoint الحالي GET /notifications بمعاملات
 * priority/channel الإضافية الجديدة فقط (بلا أي تعديل على صفحة /notifications
 * القائمة أو مكوّناتها - راجع القيد الصريح بالمهمة)
 */
export function NotificationLogCard() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<string>(ANY);
  const [channel, setChannel] = useState<string>(ANY);
  const [status, setStatus] = useState<string>(ANY);

  const { data, isLoading, isError, error, refetch } = useNotificationsQuery({
    page,
    limit,
    search: search.trim() || undefined,
    priority: priority === ANY ? undefined : (priority as NotificationPriority),
    channel: channel === ANY ? undefined : (channel as NotificationChannel),
    status: status === ANY ? undefined : (status as NotificationStatusFilter),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">سجل الإشعارات</CardTitle>
        <div className="flex items-center gap-1.5">
          <ExportButton icon={FileSpreadsheet} label="CSV" />
          <ExportButton icon={FileSpreadsheet} label="Excel" />
          <ExportButton icon={FileText} label="PDF" />
          <ExportButton icon={Printer} label="طباعة" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <Search
              className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="بحث بالعنوان أو المحتوى أو النوع..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="ps-9"
            />
          </div>

          <Select value={priority} onValueChange={(v) => { setPriority(v ?? ANY); setPage(1); }}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue placeholder="الأولوية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>كل الأولويات</SelectItem>
              {(Object.keys(PRIORITY_LABELS) as NotificationPriority[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={channel} onValueChange={(v) => { setChannel(v ?? ANY); setPage(1); }}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue placeholder="القناة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>كل القنوات</SelectItem>
              {(Object.keys(CHANNEL_LABELS) as NotificationChannel[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => { setStatus(v ?? ANY); setPage(1); }}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>كل الحالات</SelectItem>
              {(Object.keys(STATUS_LABELS) as NotificationStatusFilter[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : !data || data.notifications.length === 0 ? (
          <EmptyState icon={Search} title="لا نتائج مطابقة" />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="p-2.5 text-start font-medium">العنوان</th>
                  <th className="p-2.5 text-start font-medium">النوع</th>
                  <th className="p-2.5 text-start font-medium">الأولوية</th>
                  <th className="p-2.5 text-start font-medium">الوقت</th>
                </tr>
              </thead>
              <tbody>
                {data.notifications.map((n) => (
                  <tr key={n.id} className="border-b last:border-b-0">
                    <td className="max-w-64 truncate p-2.5">{n.title}</td>
                    <td className="p-2.5 text-xs text-muted-foreground">{n.type}</td>
                    <td className="p-2.5">
                      {n.priority === "HIGH" ? (
                        <Badge variant="destructive" className="h-4 px-1 text-[9px]">
                          عاجل
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {PRIORITY_LABELS[n.priority]}
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-xs text-muted-foreground">
                      {formatRelativeTime(n.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.meta.total > 0 && (
          <DataPagination
            meta={data.meta}
            onPageChange={setPage}
            onLimitChange={(v) => {
              setLimit(v);
              setPage(1);
            }}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </CardContent>
    </Card>
  );
}

/** مُعطَّل مع تلميح - Reports Export (المرحلة 5) لم تبدأ بعد */
function ExportButton({ icon: Icon, label }: { icon: typeof Download; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="outline" size="icon-sm" disabled aria-label={`تصدير ${label}`}>
            <Icon aria-hidden />
          </Button>
        }
      />
      <TooltipContent>تصدير {label} - غير متاح بعد (Phase 5)</TooltipContent>
    </Tooltip>
  );
}
