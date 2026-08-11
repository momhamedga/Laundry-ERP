"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpenseQuery } from "@/hooks/use-expenses";
import { getErrorMessage } from "@/lib/axios";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  EXPENSE_STATUS_VARIANT,
} from "@/lib/expenses";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

interface ExpenseDetailDialogProps {
  expenseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 last:border-b-0">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="text-end text-sm">{children}</span>
    </div>
  );
}

export function ExpenseDetailDialog({ expenseId, open, onOpenChange }: ExpenseDetailDialogProps) {
  const { data: expense, isLoading, isError, error, refetch } = useExpenseQuery(open ? expenseId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>تفاصيل المصروف</DialogTitle>
          <DialogDescription>السجلّ الكامل بما فيه بيانات الإلغاء إن وُجدت</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : expense ? (
          <div>
            <Row label="المبلغ">
              <b>{formatCurrency(expense.amount)}</b>
            </Row>
            <Row label="الفئة">{EXPENSE_CATEGORY_LABELS[expense.category]}</Row>
            <Row label="الحالة">
              <Badge variant={EXPENSE_STATUS_VARIANT[expense.status]}>
                {EXPENSE_STATUS_LABELS[expense.status]}
              </Badge>
            </Row>
            <Row label="التاريخ">{formatDate(expense.expenseDate)}</Row>
            <Row label="الفرع">{expense.branch.name}</Row>
            <Row label="سجّله">{expense.createdBy.name}</Row>
            <Row label="تاريخ التسجيل">{formatDateTime(expense.createdAt)}</Row>
            {expense.notes && <Row label="ملاحظات">{expense.notes}</Row>}
            {expense.status === "CANCELLED" && (
              <>
                <Row label="ألغاه">{expense.cancelledBy?.name ?? "—"}</Row>
                <Row label="تاريخ الإلغاء">{formatDateTime(expense.cancelledAt)}</Row>
                <Row label="سبب الإلغاء">{expense.cancelReason ?? "—"}</Row>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
