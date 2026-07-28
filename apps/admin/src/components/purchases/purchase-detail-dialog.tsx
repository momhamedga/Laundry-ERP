"use client";

import { CheckCircle2, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCancelPurchaseMutation, usePurchaseQuery, useReceivePurchaseMutation } from "@/hooks/use-purchases";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { fmtQty, PURCHASE_STATUS_LABELS } from "@/components/inventory/inventory-format";

interface PurchaseDetailDialogProps {
  purchaseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseDetailDialog({ purchaseId, open, onOpenChange }: PurchaseDetailDialogProps) {
  const { can } = usePermissions();
  const canManage = can("purchase:manage");
  const { data, isLoading } = usePurchaseQuery(open ? purchaseId : null);
  const receiveMutation = useReceivePurchaseMutation();
  const cancelMutation = useCancelPurchaseMutation();

  const canAct = data && data.status !== "RECEIVED" && data.status !== "CANCELLED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle dir="ltr" className="text-right">
            {data?.purchaseNumber ?? "…"}
          </DialogTitle>
          <DialogDescription>
            {data ? (
              <>
                {data.supplier.name} —{" "}
                <Badge variant={data.status === "RECEIVED" ? "default" : data.status === "CANCELLED" ? "destructive" : "secondary"}>
                  {PURCHASE_STATUS_LABELS[data.status]}
                </Badge>{" "}
                — {formatDateTime(data.createdAt)}
              </>
            ) : (
              "…"
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الصنف</TableHead>
                    <TableHead className="text-end">الكمية</TableHead>
                    <TableHead className="text-end">التكلفة</TableHead>
                    <TableHead className="text-end">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.item.name}</TableCell>
                      <TableCell className="text-end tabular-nums">{fmtQty(it.quantity)}</TableCell>
                      <TableCell className="text-end">{formatCurrency(it.unitCost)}</TableCell>
                      <TableCell className="text-end">{formatCurrency(it.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-6 text-sm">
              <span>الفرعي: <b>{formatCurrency(data.subtotal)}</b></span>
              <span>الضريبة ({Number(data.taxRate)}%): <b>{formatCurrency(data.tax)}</b></span>
              <span>الإجمالي: <b>{formatCurrency(data.total)}</b></span>
            </div>
          </div>
        )}

        <DialogFooter>
          {canManage && canAct && (
            <>
              <Button variant="outline" className="text-destructive" disabled={cancelMutation.isPending} onClick={() => { if (purchaseId) cancelMutation.mutate(purchaseId, { onSuccess: () => onOpenChange(false) }); }}>
                {cancelMutation.isPending ? <Spinner className="size-3.5" /> : <Ban aria-hidden />}
                إلغاء الأمر
              </Button>
              <Button disabled={receiveMutation.isPending} onClick={() => { if (purchaseId) receiveMutation.mutate(purchaseId, { onSuccess: () => onOpenChange(false) }); }}>
                {receiveMutation.isPending ? <Spinner className="size-3.5 text-primary-foreground" /> : <CheckCircle2 aria-hidden />}
                استلام وتحديث المخزون
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
