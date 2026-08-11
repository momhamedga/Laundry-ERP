"use client";

import { Ban, Eye, Pencil, Plus, Receipt } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DataPagination } from "@/components/tables/data-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useActiveBranchesQuery } from "@/hooks/use-branches";
import { useExpensesQuery, useOperatingSummaryQuery } from "@/hooks/use-expenses";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import {
  canCancelExpense,
  canEditExpense,
  currentMonthBounds,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  EXPENSE_STATUS_VARIANT,
  rangeToParams,
} from "@/lib/expenses";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  type ExpenseCategory,
  type ExpenseRow,
  type ExpenseStatus,
  type ListExpensesParams,
} from "@/types/expenses";
import { ExpenseCancelDialog } from "./expense-cancel-dialog";
import { ExpenseDetailDialog } from "./expense-detail-dialog";
import { ExpenseFormDialog } from "./expense-form-dialog";

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums ${
          tone === "negative" ? "text-destructive" : tone === "positive" ? "text-emerald-600" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function ExpensesView() {
  const { can } = usePermissions();
  const canCreate = can("expense:create");
  const canUpdate = can("expense:update");
  const canCancel = can("expense:cancel");

  const defaults = currentMonthBounds();
  const [params, setParams] = useState<ListExpensesParams>({
    page: 1,
    limit: 20,
    from: defaults.from,
    to: defaults.to,
    sortBy: "expenseDate",
    sortOrder: "desc",
  });

  /**
   * `params` تحمل `YYYY-MM-DD` لحقول التاريخ في الشاشة، والخادم يستقبل لحظات.
   *
   * الفصل ضروري: إرسال التاريخ المجرّد يجعل الخادم يقرأه منتصف ليل عالمي فيسقط
   * يوم البداية كاملاً عن نتيجة مستخدمٍ شرق غرينتش.
   */
  const queryParams: ListExpensesParams = { ...params, ...rangeToParams(params.from, params.to) };

  const { data, isLoading, isError, error, refetch } = useExpensesQuery(queryParams);
  const { data: branches } = useActiveBranchesQuery();

  /**
   * الملخّص يتبع مدى التاريخ والفرع فقط — لا الفئة ولا البحث.
   *
   * إيرادُ فترةٍ لا يُقسَّم على فئات المصروفات؛ حصر الملخّص بمرشّح الفئة يعطي
   * «ناتجاً تشغيلياً» يقارن كامل الإيراد بجزءٍ من المصروف، وهو رقمٌ مضلِّل.
   */
  const summaryEnabled = Boolean(params.from && params.to);
  const { data: summary } = useOperatingSummaryQuery(
    { from: queryParams.from ?? "", to: queryParams.to ?? "", branchId: params.branchId },
    summaryEnabled,
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toCancel, setToCancel] = useState<ExpenseRow | null>(null);

  /** أي تغيير مرشّح يعيد الترقيم للصفحة الأولى — وإلا ظهرت صفحة فارغة */
  function changeFilter(patch: Partial<ListExpensesParams>) {
    setParams((prev) => ({ ...prev, ...patch, page: 1 }));
  }

  const expenses = data?.expenses ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="المصروفات"
        description="مصروفات التشغيل اليومية وأثرها على الناتج التشغيلي"
        actions={
          canCreate ? (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus aria-hidden /> مصروف
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="الإيراد" value={formatCurrency(summary?.revenue ?? 0)} tone="positive" />
        <SummaryCard
          label="المصروفات"
          value={formatCurrency(summary?.expenses ?? data?.totalAmount ?? 0)}
          tone="negative"
        />
        <SummaryCard
          label="الناتج التشغيلي"
          value={formatCurrency(summary?.operatingResult ?? 0)}
          tone={Number(summary?.operatingResult ?? 0) < 0 ? "negative" : "positive"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="f-from">من تاريخ</Label>
          <Input
            id="f-from"
            type="date"
            value={params.from ?? ""}
            onChange={(e) => changeFilter({ from: e.target.value || undefined })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-to">إلى تاريخ</Label>
          <Input
            id="f-to"
            type="date"
            value={params.to ?? ""}
            onChange={(e) => changeFilter({ to: e.target.value || undefined })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>الفئة</Label>
          <Select
            value={params.category ?? "all"}
            onValueChange={(v) =>
              changeFilter({ category: v === "all" ? undefined : (v as ExpenseCategory) })
            }
          >
            <SelectTrigger className="w-full" aria-label="الفئة">
              <SelectValue placeholder="الفئة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>الفرع</Label>
          <Select
            value={params.branchId ?? "all"}
            onValueChange={(v) => changeFilter({ branchId: !v || v === "all" ? undefined : v })}
          >
            <SelectTrigger className="w-full" aria-label="الفرع">
              <SelectValue placeholder="الفرع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفروع</SelectItem>
              {(branches ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>الحالة</Label>
          <Select
            value={params.status ?? "all"}
            onValueChange={(v) =>
              changeFilter({ status: v === "all" ? undefined : (v as ExpenseStatus) })
            }
          >
            <SelectTrigger className="w-full" aria-label="الحالة">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {EXPENSE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {EXPENSE_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border">
        {isLoading && !data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="لا توجد مصروفات"
            description="لا مصروفات ضمن المرشّحات المحدَّدة"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الفئة</TableHead>
                    <TableHead className="text-end">المبلغ</TableHead>
                    <TableHead>الفرع</TableHead>
                    <TableHead>سجّله</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>ملاحظات</TableHead>
                    <TableHead className="text-end">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e) => (
                    <TableRow key={e.id} className={e.status === "CANCELLED" ? "opacity-60" : ""}>
                      <TableCell className="text-sm">{formatDate(e.expenseDate)}</TableCell>
                      <TableCell>{EXPENSE_CATEGORY_LABELS[e.category]}</TableCell>
                      <TableCell
                        className={`text-end tabular-nums ${e.status === "CANCELLED" ? "line-through" : ""}`}
                      >
                        {formatCurrency(e.amount)}
                      </TableCell>
                      <TableCell>{e.branch.name}</TableCell>
                      <TableCell className="text-sm">{e.createdBy.name}</TableCell>
                      <TableCell>
                        <Badge variant={EXPENSE_STATUS_VARIANT[e.status]}>
                          {EXPENSE_STATUS_LABELS[e.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-40 truncate text-sm">
                        {e.notes ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="عرض"
                            onClick={() => {
                              setDetailId(e.id);
                              setDetailOpen(true);
                            }}
                          >
                            <Eye aria-hidden />
                          </Button>
                          {canUpdate && canEditExpense(e) && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="تعديل"
                              onClick={() => {
                                setEditing(e);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil aria-hidden />
                            </Button>
                          )}
                          {canCancel && canCancelExpense(e) && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              title="إلغاء"
                              onClick={() => setToCancel(e)}
                            >
                              <Ban aria-hidden />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* الإجمالي من الخادم لكامل نتيجة المرشّح لا لصفّ الصفحة الظاهر */}
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">إجمالي المصروفات النشطة (كل النتائج)</span>
              <b className="tabular-nums">{formatCurrency(data?.totalAmount ?? 0)}</b>
            </div>

            {data && (
              <DataPagination
                meta={data.meta}
                onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
                onLimitChange={(limit) => setParams((prev) => ({ ...prev, limit, page: 1 }))}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            )}
          </>
        )}
      </div>

      <ExpenseFormDialog open={formOpen} onOpenChange={setFormOpen} expense={editing} />
      <ExpenseDetailDialog expenseId={detailId} open={detailOpen} onOpenChange={setDetailOpen} />
      <ExpenseCancelDialog expense={toCancel} onOpenChange={(o) => !o && setToCancel(null)} />
    </div>
  );
}
