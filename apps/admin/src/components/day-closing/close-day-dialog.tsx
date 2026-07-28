"use client";

import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCloseDayMutation, usePreCloseCheckQuery } from "@/hooks/use-day-closing";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DayCashSummary } from "@/types/day-closing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cash: DayCashSummary | null;
}

export function CloseDayDialog({ open, onOpenChange, cash }: Props) {
  const mutation = useCloseDayMutation();
  const { can } = usePermissions();
  const preClose = usePreCloseCheckQuery(open);
  const [actualCash, setActualCash] = useState("");
  const [differenceNote, setDifferenceNote] = useState("");
  const [force, setForce] = useState(false);

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setActualCash("");
      setDifferenceNote("");
      setForce(false);
    }
  }

  const check = preClose.data;
  const hasWarnings = check?.hasWarnings ?? false;
  const hasBlocking = check?.hasBlocking ?? false;
  const isAdmin = can("day:reopen"); // reopen حصرية لـ ADMIN - نفس مؤشّر الصلاحية العليا

  const expected = cash?.expectedCash ?? 0;
  const difference = useMemo(() => {
    if (actualCash === "") return null;
    return Math.round((Number(actualCash) - expected + Number.EPSILON) * 100) / 100;
  }, [actualCash, expected]);

  const needsNote = difference !== null && difference !== 0;
  const warningsBlock = hasWarnings && !(force && isAdmin);
  const canSubmit =
    actualCash !== "" &&
    (!needsNote || differenceNote.trim().length > 0) &&
    !hasBlocking &&
    !warningsBlock;

  async function submit() {
    if (!canSubmit) return;
    try {
      await mutation.mutateAsync({
        actualCash: Number(actualCash),
        differenceNote: differenceNote.trim() || undefined,
        force: hasWarnings ? true : undefined,
      });
      onOpenChange(false);
    } catch {
      // toast عبر onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إغلاق يوم العمل</DialogTitle>
          <DialogDescription>
            عُدّ النقد الفعلي في الصندوق وأدخله. سيُبنى تقرير اليوم النهائي وتُقفل التعديلات.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* فحص ما قبل الإغلاق */}
          {check && check.items.length > 0 && (
            <div
              className={cn(
                "space-y-2 rounded-lg border p-3 text-sm",
                hasBlocking
                  ? "border-destructive/40 bg-destructive/10"
                  : "border-warning/40 bg-warning/10",
              )}
            >
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4" aria-hidden />
                فحص ما قبل الإغلاق
              </div>
              <ul className="space-y-1">
                {check.items.map((it) => (
                  <li key={it.key} className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        it.severity === "blocking" && "text-destructive",
                        it.severity === "warning" && "text-warning",
                        it.severity === "info" && "text-muted-foreground",
                      )}
                    >
                      {it.label}
                    </span>
                    <span className="tabular-nums">{it.count}</span>
                  </li>
                ))}
              </ul>
              {hasBlocking && (
                <p className="text-xs text-destructive">
                  يوجد موانع صارمة (مثل يوم سابق مفتوح) - عالجها قبل الإغلاق.
                </p>
              )}
              {!hasBlocking && hasWarnings && !isAdmin && (
                <p className="text-xs text-muted-foreground">
                  تجاوز التحذيرات والإغلاق متاح لمدير النظام فقط.
                </p>
              )}
              {!hasBlocking && hasWarnings && isAdmin && (
                <label className="flex items-center gap-2 pt-1 text-xs">
                  <Checkbox checked={force} onCheckedChange={(v) => setForce(v === true)} />
                  أؤكّد المراجعة وأتجاوز التحذيرات لإتمام الإغلاق
                </label>
              )}
            </div>
          )}

          {cash && (
            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground">افتتاحي الصندوق</span>
              <span className="text-end tabular-nums">{formatCurrency(cash.openingCash)}</span>
              <span className="text-muted-foreground">مبيعات نقدية</span>
              <span className="text-end tabular-nums">{formatCurrency(cash.cashSales)}</span>
              <span className="text-muted-foreground">إيداعات نقدية</span>
              <span className="text-end tabular-nums">{formatCurrency(cash.cashIn)}</span>
              <span className="text-muted-foreground">مسحوبات نقدية</span>
              <span className="text-end tabular-nums">{formatCurrency(cash.cashOut)}</span>
              <span className="font-medium">المتوقع بالصندوق</span>
              <span className="text-end font-bold tabular-nums">{formatCurrency(expected)}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="actual-cash">النقد الفعلي المعدود *</Label>
            <Input
              id="actual-cash"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
            />
          </div>

          {difference !== null && (
            <div
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium",
                difference === 0 && "bg-muted text-muted-foreground",
                difference > 0 && "bg-success/15 text-success",
                difference < 0 && "bg-destructive/10 text-destructive",
              )}
            >
              <span>
                {difference === 0 ? "الصندوق مطابق" : difference > 0 ? "زيادة" : "عجز"}
              </span>
              <span className="tabular-nums">{formatCurrency(Math.abs(difference))}</span>
            </div>
          )}

          {needsNote && (
            <div className="space-y-1.5">
              <Label htmlFor="diff-note">سبب الفرق *</Label>
              <Textarea
                id="diff-note"
                rows={2}
                value={differenceNote}
                onChange={(e) => setDifferenceNote(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button onClick={() => void submit()} disabled={mutation.isPending || !canSubmit}>
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            إغلاق اليوم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
