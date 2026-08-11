"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCancelExpenseMutation } from "@/hooks/use-expenses";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/expenses";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ExpenseRow } from "@/types/expenses";

const MIN_REASON = 3;
const MAX_REASON = 300;

interface ExpenseCancelDialogProps {
  expense: ExpenseRow | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * الإلغاء لا الحذف — والسبب إلزامي.
 *
 * سجلٌّ ملغى بلا سبب يترك المراجع أمام فرقٍ في الإجمالي لا يفسّره شيء، وهو
 * بالضبط ما تمنعه سياسة السجلات المالية في المشروع.
 */
export function ExpenseCancelDialog({ expense, onOpenChange }: ExpenseCancelDialogProps) {
  const mutation = useCancelExpenseMutation();
  const [reason, setReason] = useState("");

  const [prevId, setPrevId] = useState<string | null>(null);
  const currentId = expense?.id ?? null;
  if (currentId !== prevId) {
    setPrevId(currentId);
    setReason("");
  }

  const trimmed = reason.trim();
  const canSubmit = trimmed.length >= MIN_REASON && trimmed.length <= MAX_REASON;

  function submit() {
    if (!expense || !canSubmit) return;
    mutation.mutate(
      { id: expense.id, reason: trimmed },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={expense !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إلغاء المصروف؟</DialogTitle>
          <DialogDescription>
            لا يُحذف السجلّ — يبقى ظاهراً ويخرج من كل الإجماليات، والسبب يُحفظ في التدقيق.
          </DialogDescription>
        </DialogHeader>

        {expense && (
          <div className="bg-muted/40 rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">المبلغ</span>
              <b>{formatCurrency(expense.amount)}</b>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">الفئة</span>
              <span>{EXPENSE_CATEGORY_LABELS[expense.category]}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">التاريخ</span>
              <span>{formatDate(expense.expenseDate)}</span>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="cancel-reason">سبب الإلغاء *</Label>
          <Textarea
            id="cancel-reason"
            rows={3}
            maxLength={MAX_REASON}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: سُجّل بالخطأ مرتين"
          />
          <p className="text-muted-foreground text-xs">
            {trimmed.length < MIN_REASON ? `${MIN_REASON} أحرف على الأقل` : `${trimmed.length}/${MAX_REASON}`}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            تراجع
          </Button>
          <Button variant="destructive" onClick={submit} disabled={mutation.isPending || !canSubmit}>
            {mutation.isPending && <Spinner className="text-destructive-foreground" />}
            تأكيد الإلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
