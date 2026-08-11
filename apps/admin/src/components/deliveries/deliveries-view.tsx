"use client";

import { useMemo, useState } from "react";
import { OrderDetailsDrawer } from "@/components/orders/order-details-drawer";
import { UpdateStatusDialog } from "@/components/orders/update-status-dialog";
import { CreatePaymentDialog } from "@/components/payments/create-payment-dialog";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { DataPagination } from "@/components/tables/data-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveBranchesQuery } from "@/hooks/use-branches";
import { useOrderDetailQuery, useOrdersQuery } from "@/hooks/use-orders";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import {
  rangeToParams,
  type DeliveryPaymentFilter,
  type DeliveryRange,
} from "@/lib/deliveries";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrdersFilters } from "@/hooks/use-orders-filters";
import { DeliveriesTable } from "./deliveries-table";

const RANGES: { value: DeliveryRange; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "overdue", label: "متأخّرة" },
  { value: "upcoming", label: "قادمة" },
];

const PAYMENT_FILTERS: Record<DeliveryPaymentFilter, string> = {
  all: "الكل",
  unpaid: "غير مسدَّدة",
  paid: "مسدَّدة",
};

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 50;

/**
 * شاشة تسليمات اليوم.
 *
 * تُغني عن المسار اليومي: الطلبات ← فلاتر ← حالة ← تاريخ ← جاهز. وهي أهمّ قائمة
 * في يوم المغسلة، فكونها خلف أربع خطوات يعني أن تُبنى ذهنياً كل صباح.
 *
 * كل تصفية تجري على الخادم — النطاق عبر dueFrom/dueTo، والفرع والسداد عبر
 * معاملات قائمة. لا جلب للكلّ ثم غربلة في المتصفّح: تكلفةٌ تنمو مع كل طلب.
 *
 * «جاهز» مرشّح مستقلّ لا افتراض: الطلب المستحقّ اليوم وهو في «كي» يخصّ الموظّف
 * أيضاً — إخفاؤه يجعله يكتشف التأخير من العميل لا من الشاشة.
 */
export function DeliveriesView() {
  const { can } = usePermissions();
  const [range, setRange] = useState<DeliveryRange>("today");
  const [branchId, setBranchId] = useState<string>("all");
  const [readyOnly, setReadyOnly] = useState(false);
  const [payment, setPayment] = useState<DeliveryPaymentFilter>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

  const [viewOrderId, setViewOrderId] = useState<string | null>(null);

  /**
   * حوارا الدفع وتغيير الحالة يقبلان OrderDetail لا صفّ القائمة، فيُجلب التفصيل
   * عند الضغط بالخطّاف القائم — طلبٌ واحد لكل إجراء لا لكل صفّ.
   *
   * وهو الأصحّ لا مجرّد الأسهل: صفّ القائمة قد يكون قديماً (قد يكون زميلٌ سجّل
   * دفعةً أو سلّم الطلب للتوّ)، والحوار يجب أن يبني قراره على الحالة الآن.
   * والبديل — توسيع أنواع مكوّنات تعمل بشكل صحيح — تعديلٌ فيها بلا داعٍ.
   */
  const [action, setAction] = useState<{ type: "pay" | "deliver"; id: string } | null>(null);
  const { data: actionOrder } = useOrderDetailQuery(action?.id ?? null);

  const canRecordPayment = can("payments:create");
  const canChangeStatus = can("orders:update-status");

  const { data: branches } = useActiveBranchesQuery();

  const filters = useMemo<OrdersFilters>(() => {
    const { dueFrom, dueTo } = rangeToParams(range);
    return {
      page,
      limit,
      dueFrom,
      dueTo,
      ...(branchId !== "all" ? { branchId } : {}),
      ...(readyOnly ? { status: "READY" as const } : {}),
      ...(payment === "paid" ? { paymentStatus: "PAID" as const } : {}),
      ...(payment === "unpaid" ? { paymentStatus: "UNPAID" as const } : {}),
      sortBy: "dueDate" as const,
      sortOrder: "asc" as const,
    };
  }, [range, branchId, readyOnly, payment, page, limit]);

  /**
   * أي تغيير في المرشّحات يعيد الصفحة إلى الأولى.
   *
   * بدونه: موظّف على الصفحة الثالثة من «اليوم» يضغط «متأخّرة» فيرى صفحةً ثالثة
   * قد لا توجد أصلاً — قائمة فارغة تُقرأ كـ«لا متأخّرات» وهي كذبة.
   */
  function changeFilter(apply: () => void) {
    apply();
    setPage(1);
  }

  const { data, isPending, isError, error, refetch } = useOrdersQuery(filters);

  /**
   * `data?.orders ?? []` مباشرةً كان يُنشئ مصفوفة جديدة كل تصيير، فتتغيّر
   * اعتمادية useMemo دائماً ويُعاد الحساب بلا داع. المرجع الآن ثابت ما دامت
   * البيانات ثابتة.
   */
  const orders = useMemo(() => data?.orders ?? [], [data?.orders]);

  /**
   * الإجماليات محسوبة من الصفحة المعروضة لا من كل النتائج — وهو ما تعنيه
   * التسمية «في هذه الصفحة». عرضها كإجمالٍ مطلق كان سيكذب عند تجاوز الصفحة.
   */
  const totals = useMemo(() => {
    const due = orders.reduce((sum, o) => sum + Math.max(Number(o.total) - Number(o.paidAmount), 0), 0);
    return { count: orders.length, due };
  }, [orders]);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">تسليمات اليوم</h1>
        <p className="text-sm text-muted-foreground">
          الطلبات المستحقّة حسب موعد التسليم، مرتّبة من الأقدم.
        </p>
      </header>

      {/* ــــ المرشّحات ــــ */}
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="نطاق التسليم" className="flex rounded-lg border p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={range === r.value}
              onClick={() => changeFilter(() => setRange(r.value))}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                range === r.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <Select
          value={branchId}
          onValueChange={(v) => changeFilter(() => setBranchId(v ?? "all"))}
          items={{ all: "كل الفروع", ...Object.fromEntries((branches ?? []).map((b) => [b.id, b.name])) }}
        >
          <SelectTrigger className="w-40" aria-label="الفرع">
            <SelectValue />
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

        <Select
          value={payment}
          onValueChange={(v) => changeFilter(() => setPayment((v as DeliveryPaymentFilter) ?? "all"))}
          items={PAYMENT_FILTERS}
        >
          <SelectTrigger className="w-36" aria-label="حالة السداد">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PAYMENT_FILTERS) as DeliveryPaymentFilter[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PAYMENT_FILTERS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant={readyOnly ? "default" : "outline"}
          aria-pressed={readyOnly}
          onClick={() => changeFilter(() => setReadyOnly((v) => !v))}
        >
          جاهزة للتسليم فقط
        </Button>
      </div>

      {/* ــــ ملخّص الصفحة ــــ */}
      {!isError && (
        <p className="text-sm text-muted-foreground">
          {isPending ? (
            "جارٍ التحميل…"
          ) : (
            <>
              {totals.count} طلب في هذه الصفحة
              {totals.due > 0 && (
                <>
                  {" · "}
                  المتبقّي عليها{" "}
                  <span className="font-medium text-amber-600">{formatCurrency(totals.due)}</span>
                </>
              )}
            </>
          )}
        </p>
      )}

      {isError ? (
        <ErrorState
          title="تعذّر تحميل التسليمات"
          description={getErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      ) : (
        <DeliveriesTable
          orders={orders}
          isLoading={isPending}
          canRecordPayment={canRecordPayment}
          canChangeStatus={canChangeStatus}
          onView={(order) => setViewOrderId(order.id)}
          onPay={(order) => setAction({ type: "pay", id: order.id })}
          onDeliver={(order) => setAction({ type: "deliver", id: order.id })}
        />
      )}

      {/*
        الترقيم بالمكوّن العام نفسه المستخدَم في صفحة الطلبات، معتمداً على meta
        القادمة من الخادم. بدونه كان حدّ الصفحة يُخفي ما بعده بصمت: مغسلة
        بستّين تسليماً ترى خمسين وتظنّها كلّ ما لديها.
      */}
      {!isError && data && (
        <DataPagination
          meta={data.meta}
          onPageChange={setPage}
          onLimitChange={(next) => {
            setLimit(next);
            setPage(1);
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
        />
      )}

      {/* ــــ الحوارات القائمة، مُعاد استخدامها كما هي ــــ */}
      <OrderDetailsDrawer
        orderId={viewOrderId}
        open={viewOrderId !== null}
        onOpenChange={(open) => !open && setViewOrderId(null)}
      />

      {action?.type === "pay" && actionOrder && (
        <CreatePaymentDialog
          order={actionOrder}
          open
          onOpenChange={(open) => !open && setAction(null)}
        />
      )}

      {action?.type === "deliver" && actionOrder && (
        <UpdateStatusDialog
          order={actionOrder}
          open
          onOpenChange={(open) => !open && setAction(null)}
        />
      )}
    </div>
  );
}
