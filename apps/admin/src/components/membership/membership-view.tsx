"use client";

import { Crown, Pencil, Users } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportDropdown } from "@/components/reports/export-dropdown";
import { useDistributionQuery, useTiersQuery } from "@/hooks/use-membership";
import { usePermissions } from "@/hooks/use-permissions";
import type { MembershipLevel, MembershipTier } from "@/types/loyalty";
import { LEVEL_LABELS } from "@/components/loyalty/loyalty-format";
import { TierEditDialog } from "./tier-edit-dialog";

export function MembershipView() {
  const { can } = usePermissions();
  const canManage = can("membership:manage");
  const { data: tiers, isLoading } = useTiersQuery();
  const { data: distribution } = useDistributionQuery();
  const [editTier, setEditTier] = useState<MembershipTier | null>(null);
  const [open, setOpen] = useState(false);

  const distMap = new Map((distribution ?? []).map((d) => [d.level, d.count]));

  return (
    <div className="space-y-6">
      <PageHeader title="العضوية والمستويات" description="مستويات الولاء ومزاياها وتوزيع الأعضاء" />

      {/* Distribution */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {(Object.keys(LEVEL_LABELS) as MembershipLevel[]).map((l) => (
          <Card key={l}>
            <CardContent className="flex items-center justify-between gap-2 p-4">
              <div>
                <p className="text-xs text-muted-foreground">{LEVEL_LABELS[l]}</p>
                <p className="mt-1 text-lg font-bold">{distMap.get(l) ?? 0}</p>
              </div>
              <Users aria-hidden className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>المستويات والمزايا</CardTitle>
              <CardDescription>عتبات الترقية التلقائية ومزايا كل مستوى</CardDescription>
            </div>
            <ExportDropdown type="membership-distribution" filters={{}} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || !tiers ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستوى</TableHead>
                    <TableHead className="text-end">عتبة النقاط</TableHead>
                    <TableHead className="text-end">الخصم</TableHead>
                    <TableHead className="text-end">نقاط إضافية</TableHead>
                    <TableHead>المزايا</TableHead>
                    {canManage && <TableHead className="text-end">إجراء</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <Crown aria-hidden className="size-4 text-amber-500" />
                          {LEVEL_LABELS[t.level]}
                        </span>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{t.minLifetimePoints.toLocaleString("ar-EG")}</TableCell>
                      <TableCell className="text-end">{Number(t.discountPercent)}%</TableCell>
                      <TableCell className="text-end">{Number(t.extraPointsPercent)}%</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {t.priority && <Badge variant="secondary">أولوية</Badge>}
                          {t.freeService && <Badge variant="secondary">خدمة مجانية</Badge>}
                        </div>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-end">
                          <Button variant="ghost" size="icon-sm" title="تعديل" onClick={() => { setEditTier(t); setOpen(true); }}>
                            <Pencil aria-hidden />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TierEditDialog tier={editTier} open={open} onOpenChange={setOpen} />
    </div>
  );
}
