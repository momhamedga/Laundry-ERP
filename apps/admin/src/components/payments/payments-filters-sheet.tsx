"use client";

import { Filter } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomerFilterField } from "@/components/orders/customer-filter-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { PaymentsFilters } from "@/hooks/use-payments-filters";
import type { PaymentMethod, PaymentTxStatus } from "@/types/payment";
import { OrderFilterField } from "./order-filter-field";

interface PaymentsFiltersSheetProps {
  filters: PaymentsFilters;
  onApply: (patch: Partial<PaymentsFilters>) => void;
  activeCount: number;
}

type MethodValue = PaymentMethod | "all";
type StatusValue = PaymentTxStatus | "all";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "نقدي",
  CARD: "بطاقة",
  BANK_TRANSFER: "تحويل بنكي",
  MOBILE_WALLET: "محفظة إلكترونية",
};

const STATUS_LABELS: Record<PaymentTxStatus, string> = {
  PENDING: "قيد الانتظار",
  COMPLETED: "مكتملة",
  FAILED: "فشلت",
  CANCELLED: "ملغاة",
  REFUNDED: "مستردة",
};

/**
 * فلاتر متقدمة: الطلب/العميل/الطريقة/الحالة/فترة التاريخ/نطاق المبلغ
 * ملاحظة معمارية: لا يوجد customerId بمعامِلات GET /payments بالخادم (فقط orderId) -
 * فلتر العميل هنا يُعبّئ حقل "search" العام باسم العميل المختار (الخادم أصلاً يطابق
 * اسم العميل ضمن search - راجع buildPaymentWhere) بدل تكرار حقل عميل وهمي بلا غطاء خادمي
 */
export function PaymentsFiltersSheet({ filters, onApply, activeCount }: PaymentsFiltersSheetProps) {
  const [open, setOpen] = useState(false);

  const [orderId, setOrderId] = useState(filters.orderId);
  const [orderNumber, setOrderNumber] = useState(filters.orderNumber);
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [customerName, setCustomerName] = useState<string | undefined>(
    filters.orderId ? undefined : filters.search,
  );
  const [method, setMethod] = useState<MethodValue>(filters.method ?? "all");
  const [status, setStatus] = useState<StatusValue>(filters.status ?? "all");
  const [dateFrom, setDateFrom] = useState(filters.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(filters.dateTo ?? "");
  const [minAmount, setMinAmount] = useState(filters.minAmount?.toString() ?? "");
  const [maxAmount, setMaxAmount] = useState(filters.maxAmount?.toString() ?? "");

  function handleOpenChange(next: boolean) {
    if (next) {
      setOrderId(filters.orderId);
      setOrderNumber(filters.orderNumber);
      setCustomerId(undefined);
      setCustomerName(filters.orderId ? undefined : filters.search);
      setMethod(filters.method ?? "all");
      setStatus(filters.status ?? "all");
      setDateFrom(filters.dateFrom ?? "");
      setDateTo(filters.dateTo ?? "");
      setMinAmount(filters.minAmount?.toString() ?? "");
      setMaxAmount(filters.maxAmount?.toString() ?? "");
    }
    setOpen(next);
  }

  function handleApply() {
    onApply({
      orderId,
      orderNumber,
      // فلتر العميل يُترجَم لـ search عاماً؛ يُهمَل عند اختيار طلب محدد لتفادي تعارض المعنى
      search: orderId ? undefined : (customerName ?? undefined),
      method: method === "all" ? undefined : method,
      status: status === "all" ? undefined : status,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
    });
    setOpen(false);
  }

  function handleReset() {
    setOrderId(undefined);
    setOrderNumber(undefined);
    setCustomerId(undefined);
    setCustomerName(undefined);
    setMethod("all");
    setStatus("all");
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
    onApply({
      orderId: undefined,
      orderNumber: undefined,
      search: undefined,
      method: undefined,
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      minAmount: undefined,
      maxAmount: undefined,
    });
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button variant="outline" className="relative">
            <Filter aria-hidden /> فلاتر
            {activeCount > 0 && (
              <span className="absolute -top-1.5 -end-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        }
      />
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>فلاتر المدفوعات</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 overflow-y-auto px-4">
          <div className="space-y-1.5">
            <Label>الطلب</Label>
            <OrderFilterField
              orderId={orderId}
              orderNumber={orderNumber}
              onSelect={(id, number) => {
                setOrderId(id);
                setOrderNumber(number);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>العميل</Label>
            <CustomerFilterField
              customerId={customerId}
              customerName={customerName}
              onSelect={(id, name) => {
                setCustomerId(id);
                setCustomerName(name);
              }}
            />
            {!!orderId && (
              <p className="text-xs text-muted-foreground">
                فلتر العميل غير مُفعَّل أثناء اختيار طلب محدد
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>طريقة الدفع</Label>
            <Select
              value={method}
              onValueChange={(v) => setMethod((v as MethodValue) ?? "all")}
              items={{ all: "الكل", ...METHOD_LABELS }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>حالة الدفعة</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus((v as StatusValue) ?? "all")}
              items={{ all: "الكل", ...STATUS_LABELS }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {(Object.keys(STATUS_LABELS) as PaymentTxStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-date-from">من تاريخ</Label>
            <Input
              id="filter-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-date-to">إلى تاريخ</Label>
            <Input
              id="filter-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="filter-min-amount">أقل مبلغ</Label>
              <Input
                id="filter-min-amount"
                type="number"
                min="0"
                step="0.01"
                dir="ltr"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-max-amount">أعلى مبلغ</Label>
              <Input
                id="filter-max-amount"
                type="number"
                min="0"
                step="0.01"
                dir="ltr"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
          </div>
        </div>
        <SheetFooter className="flex-row">
          <Button variant="outline" className="flex-1" onClick={handleReset}>
            مسح
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            تطبيق
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
