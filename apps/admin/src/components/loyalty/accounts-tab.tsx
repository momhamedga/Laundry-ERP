"use client";

import { Award, Coins, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination } from "@/components/tables/data-pagination";
import { useAccountsQuery, useLoyaltyStatsQuery } from "@/hooks/use-loyalty";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import type { ListAccountsParams, LoyaltyAccountRow, MembershipLevel } from "@/types/loyalty";
import { LEVEL_BADGE, LEVEL_LABELS } from "./loyalty-format";
import { PointsActionDialog } from "./points-action-dialog";

export function AccountsTab() {
  const { can } = usePermissions();
  const canManage = can("loyalty:manage");
  const [params, setParams] = useState<ListAccountsParams>({ page: 1, limit: 20 });
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<LoyaltyAccountRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useAccountsQuery(params);
  const { data: stats } = useLoyaltyStatsQuery();

  const accounts = data?.accounts ?? [];

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="حسابات الولاء" value={String(stats.totalAccounts)} icon={Users} />
          <StatCard label="النقاط الحالية" value={stats.totalCurrentPoints.toLocaleString("ar-EG")} icon={Coins} tone="success" />
          <StatCard label="نقاط العمر" value={stats.totalLifetimePoints.toLocaleString("ar-EG")} icon={Sparkles} />
          <StatCard label="المستبدلة" value={stats.totalRedeemedPoints.toLocaleString("ar-EG")} icon={Award} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="بحث بالاسم أو الهاتف…"
          className="h-8 w-56"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setParams((p) => ({ ...p, search: search.trim() || undefined, page: 1 }))}
        />
        <Select
          value={params.level ?? "all"}
          onValueChange={(v) => setParams((p) => ({ ...p, level: !v || v === "all" ? undefined : (v as MembershipLevel), page: 1 }))}
        >
          <SelectTrigger size="sm" className="w-36"><SelectValue placeholder="المستوى" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المستويات</SelectItem>
            {(Object.keys(LEVEL_LABELS) as MembershipLevel[]).map((l) => (
              <SelectItem key={l} value={l}>{LEVEL_LABELS[l]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border">
        {isLoading && !data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : accounts.length === 0 ? (
          <EmptyState icon={Coins} title="لا توجد حسابات ولاء بعد" description="تُنشأ تلقائياً عند أول عملية نقاط للعميل" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العميل</TableHead>
                    <TableHead>المستوى</TableHead>
                    <TableHead className="text-end">الحالية</TableHead>
                    <TableHead className="text-end">العمر</TableHead>
                    <TableHead className="text-end">المستبدلة</TableHead>
                    {canManage && <TableHead className="text-end">إجراء</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        {a.customer.name} <span dir="ltr" className="text-xs text-muted-foreground">{a.customer.phone}</span>
                      </TableCell>
                      <TableCell><Badge variant={LEVEL_BADGE[a.membershipLevel]}>{LEVEL_LABELS[a.membershipLevel]}</Badge></TableCell>
                      <TableCell className="text-end tabular-nums font-medium">{a.currentPoints.toLocaleString("ar-EG")}</TableCell>
                      <TableCell className="text-end tabular-nums">{a.lifetimePoints.toLocaleString("ar-EG")}</TableCell>
                      <TableCell className="text-end tabular-nums text-muted-foreground">{a.redeemedPoints.toLocaleString("ar-EG")}</TableCell>
                      {canManage && (
                        <TableCell className="text-end">
                          <Button variant="ghost" size="sm" onClick={() => { setTarget(a); setDialogOpen(true); }}>
                            <Coins aria-hidden /> نقاط
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {data && (
              <DataPagination
                meta={data.meta}
                onPageChange={(page) => setParams((p) => ({ ...p, page }))}
                onLimitChange={(limit) => setParams((p) => ({ ...p, limit, page: 1 }))}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            )}
          </>
        )}
      </div>

      <PointsActionDialog account={target} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone = "default" }: { label: string; value: string; icon: typeof Users; tone?: "default" | "success" }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-2 p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-lg font-bold">{value}</p>
        </div>
        <Icon aria-hidden className={`size-5 shrink-0 ${tone === "success" ? "text-emerald-500" : "text-muted-foreground"}`} />
      </CardContent>
    </Card>
  );
}
