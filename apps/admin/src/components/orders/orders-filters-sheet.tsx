"use client";

import { Filter } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { useActiveBranchesQuery } from "@/hooks/use-branches";
import type { OrdersFilters } from "@/hooks/use-orders-filters";
import { getOrderStatusMeta } from "@/lib/order-status";
import type { OrderStatus, PaymentStatus } from "@/types/orders";
import { CustomerFilterField } from "./customer-filter-field";

interface OrdersFiltersSheetProps {
  filters: OrdersFilters;
  onApply: (patch: Partial<OrdersFilters>) => void;
  activeCount: number;
}

type StatusValue = OrderStatus | "all";
type PaymentStatusValue = PaymentStatus | "all";
type BranchValue = string; // "all" أو معرف الفرع

const STATUSES: readonly OrderStatus[] = [
  "RECEIVED",
  "INSPECTING",
  "WASHING",
  "DRYING",
  "IRONING",
  "PACKING",
  "READY",
  "DELIVERED",
  "CANCELLED",
];

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "غير مدفوع",
  PARTIAL: "مدفوع جزئياً",
  PAID: "مدفوع بالكامل",
  REFUNDED: "مسترجع",
};

/** فلاتر متقدمة: الحالة/حالة الدفع/الفرع/العميل/فترة الاستلام */
export function OrdersFiltersSheet({ filters, onApply, activeCount }: OrdersFiltersSheetProps) {
  const [open, setOpen] = useState(false);
  const { data: branches } = useActiveBranchesQuery();

  const [status, setStatus] = useState<StatusValue>(filters.status ?? "all");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusValue>(
    filters.paymentStatus ?? "all",
  );
  const [branchId, setBranchId] = useState<BranchValue>(filters.branchId ?? "all");
  const [customerId, setCustomerId] = useState(filters.customerId);
  const [customerName, setCustomerName] = useState(filters.customerName);
  const [receivedFrom, setReceivedFrom] = useState(filters.receivedFrom ?? "");
  const [receivedTo, setReceivedTo] = useState(filters.receivedTo ?? "");

  function handleOpenChange(next: boolean) {
    if (next) {
      setStatus(filters.status ?? "all");
      setPaymentStatus(filters.paymentStatus ?? "all");
      setBranchId(filters.branchId ?? "all");
      setCustomerId(filters.customerId);
      setCustomerName(filters.customerName);
      setReceivedFrom(filters.receivedFrom ?? "");
      setReceivedTo(filters.receivedTo ?? "");
    }
    setOpen(next);
  }

  function handleApply() {
    onApply({
      status: status === "all" ? undefined : status,
      paymentStatus: paymentStatus === "all" ? undefined : paymentStatus,
      branchId: branchId === "all" ? undefined : branchId,
      customerId,
      customerName,
      receivedFrom: receivedFrom || undefined,
      receivedTo: receivedTo || undefined,
    });
    setOpen(false);
  }

  function handleReset() {
    setStatus("all");
    setPaymentStatus("all");
    setBranchId("all");
    setCustomerId(undefined);
    setCustomerName(undefined);
    setReceivedFrom("");
    setReceivedTo("");
    onApply({
      status: undefined,
      paymentStatus: undefined,
      branchId: undefined,
      customerId: undefined,
      customerName: undefined,
      receivedFrom: undefined,
      receivedTo: undefined,
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
          <SheetTitle>فلاتر الطلبات</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 overflow-y-auto px-4">
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
          </div>

          <div className="space-y-1.5">
            <Label>حالة الطلب</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as StatusValue)}
              items={{
                all: "الكل",
                ...Object.fromEntries(STATUSES.map((s) => [s, getOrderStatusMeta(s).label])),
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {getOrderStatusMeta(s).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>حالة الدفع</Label>
            <Select
              value={paymentStatus}
              onValueChange={(v) => setPaymentStatus(v as PaymentStatusValue)}
              items={{ all: "الكل", ...PAYMENT_STATUS_LABELS }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PAYMENT_STATUS_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>الفرع</Label>
            <Select
              value={branchId}
              onValueChange={(v) => setBranchId(v ?? "all")}
              items={{ all: "الكل", ...Object.fromEntries((branches ?? []).map((b) => [b.id, b.name])) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {branches?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-received-from">تاريخ الاستلام من</Label>
            <Input
              id="filter-received-from"
              type="date"
              value={receivedFrom}
              onChange={(e) => setReceivedFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-received-to">تاريخ الاستلام إلى</Label>
            <Input
              id="filter-received-to"
              type="date"
              value={receivedTo}
              onChange={(e) => setReceivedTo(e.target.value)}
            />
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
