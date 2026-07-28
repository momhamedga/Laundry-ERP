"use client";

import { Megaphone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCampaignsQuery, useCreateCampaignMutation, useDeleteCampaignMutation } from "@/hooks/use-loyalty";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDate } from "@/lib/format";
import type { CampaignType } from "@/types/loyalty";

const TYPE_LABELS: Record<CampaignType, string> = {
  BONUS: "مكافأة",
  WELCOME: "ترحيب",
  BIRTHDAY: "ميلاد",
  REFERRAL: "إحالة",
};

export function CampaignsTab() {
  const { can } = usePermissions();
  const canManage = can("loyalty:manage");
  const { data, isLoading } = useCampaignsQuery({ page: 1, limit: 50 });
  const createMutation = useCreateCampaignMutation();
  const deleteMutation = useDeleteCampaignMutation();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CampaignType>("BONUS");
  const [points, setPoints] = useState("");

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) { setName(""); setType("BONUS"); setPoints(""); }
  }

  async function submit() {
    if (name.trim().length < 2) return;
    try {
      await createMutation.mutateAsync({ name: name.trim(), type, points: Number(points) || 0 });
      setOpen(false);
    } catch { /* toast */ }
  }

  const campaigns = data?.campaigns ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage && <Button size="sm" onClick={() => setOpen(true)}><Plus aria-hidden /> حملة جديدة</Button>}
      </div>
      <div className="rounded-xl border">
        {isLoading && !data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : campaigns.length === 0 ? (
          <EmptyState icon={Megaphone} title="لا توجد حملات" description="أنشئ حملة مكافآت" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead className="text-end">النقاط</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>أُنشئت</TableHead>
                  {canManage && <TableHead className="text-end">إجراء</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-sm">{TYPE_LABELS[c.type]}</TableCell>
                    <TableCell className="text-end tabular-nums">{c.points}</TableCell>
                    <TableCell><Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "نشطة" : "متوقفة"}</Badge></TableCell>
                    <TableCell className="text-sm">{formatDate(c.createdAt)}</TableCell>
                    {canManage && (
                      <TableCell className="text-end">
                        <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(c.id)}>
                          <Trash2 aria-hidden />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>حملة مكافآت جديدة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="cname">الاسم</Label><Input id="cname" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>النوع</Label>
              <Select value={type} onValueChange={(v) => v && setType(v as CampaignType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as CampaignType[]).map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="cpts">نقاط المكافأة</Label><Input id="cpts" type="number" value={points} onChange={(e) => setPoints(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={createMutation.isPending}>إلغاء</Button>
            <Button onClick={() => void submit()} disabled={createMutation.isPending}>
              {createMutation.isPending && <Spinner className="text-primary-foreground" />}
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
