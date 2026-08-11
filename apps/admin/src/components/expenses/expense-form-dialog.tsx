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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useActiveBranchesQuery } from "@/hooks/use-branches";
import { useCreateExpenseMutation, useUpdateExpenseMutation } from "@/hooks/use-expenses";
import { EXPENSE_CATEGORY_LABELS, isValidAmount, toDateInput } from "@/lib/expenses";
import { EXPENSE_CATEGORIES, type ExpenseCategory, type ExpenseRow } from "@/types/expenses";

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** موجود ⇒ تعديل، غائب ⇒ إضافة */
  expense?: ExpenseRow | null;
}

export function ExpenseFormDialog({ open, onOpenChange, expense }: ExpenseFormDialogProps) {
  const { data: branches } = useActiveBranchesQuery({ enabled: open });
  const createMutation = useCreateExpenseMutation();
  const updateMutation = useUpdateExpenseMutation();
  const isEdit = Boolean(expense);
  const mutation = isEdit ? updateMutation : createMutation;

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [branchId, setBranchId] = useState("");
  const [expenseDate, setExpenseDate] = useState(toDateInput(new Date()));
  const [notes, setNotes] = useState("");

  /**
   * إعادة التعبئة عند الفتح لا في `useEffect`.
   *
   * التعديل أثناء العرض (نمط React لتحديث الحالة من الخصائص) يتجنّب دورة عرضٍ
   * إضافية تُظهر بيانات المصروف السابق للحظة عند فتح حوار مصروفٍ آخر.
   */
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount(expense ? expense.amount : "");
      setCategory(expense ? expense.category : "");
      setBranchId(expense ? expense.branchId : "");
      setExpenseDate(expense ? toDateInput(new Date(expense.expenseDate)) : toDateInput(new Date()));
      setNotes(expense?.notes ?? "");
    }
  }

  const amountValid = isValidAmount(amount);
  const canSubmit = amountValid && category !== "" && branchId !== "" && expenseDate !== "";

  async function submit() {
    if (!canSubmit) return;
    const payload = {
      amount: Number(amount),
      category: category as ExpenseCategory,
      branchId,
      expenseDate: new Date(`${expenseDate}T00:00:00`).toISOString(),
      notes: notes.trim() || undefined,
    };
    try {
      if (expense) {
        await updateMutation.mutateAsync({ id: expense.id, input: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // الخطأ يُعرض عبر onError في الخطّاف
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل مصروف" : "تسجيل مصروف"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "التعديل يُسجَّل في سجلّ التدقيق بالقيمة قبل وبعد"
              : "المصروف يُخصم من الإيراد في الناتج التشغيلي للفترة"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">المبلغ *</Label>
              <Input
                id="exp-amount"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={amount !== "" && !amountValid}
              />
              {amount !== "" && !amountValid && (
                <p className="text-destructive text-xs">أدخل مبلغاً موجباً صالحاً</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">التاريخ *</Label>
              <Input
                id="exp-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>الفئة *</Label>
              <Select value={category} onValueChange={(v) => setCategory((v ?? "") as ExpenseCategory)}>
                <SelectTrigger className="w-full" aria-label="الفئة">
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {EXPENSE_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>الفرع *</Label>
              <Select value={branchId} onValueChange={(v) => setBranchId(v ?? "")}>
                <SelectTrigger className="w-full" aria-label="الفرع">
                  <SelectValue placeholder="اختر الفرع" />
                </SelectTrigger>
                <SelectContent>
                  {(branches ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-notes">ملاحظات</Label>
            <Input
              id="exp-notes"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اختياري"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button onClick={() => void submit()} disabled={mutation.isPending || !canSubmit}>
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            {isEdit ? "حفظ" : "تسجيل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
