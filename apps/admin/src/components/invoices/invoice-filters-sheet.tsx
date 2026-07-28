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
import { useActiveBranchesQuery } from "@/hooks/use-branches";
import type { InvoicesFilters } from "@/hooks/use-invoices-filters";
import type { InvoiceStatus } from "@/types/invoice";
import { OrderFilterField } from "../payments/order-filter-field";

interface InvoiceFiltersSheetProps {
  filters: InvoicesFilters;
  onApply: (patch: Partial<InvoicesFilters>) => void;
  activeCount: number;
}

type StatusValue = InvoiceStatus | "all";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "مسودة",
  ISSUED: "صادرة",
  PARTIALLY_PAID: "مدفوعة جزئياً",
  PAID: "مدفوعة بالكامل",
  CANCELLED: "ملغاة",
};

/** فلاتر متقدمة: الحالة/العميل/الفرع/الطلب/فترة الإصدار - بنفس نمط PaymentsFiltersSheet حرفياً */
export function InvoiceFiltersSheet({ filters, onApply, activeCount }: InvoiceFiltersSheetProps) {
  const [open, setOpen] = useState(false);
  const { data: branches } = useActiveBranchesQuery();

  const [status, setStatus] = useState<StatusValue>(filters.status ?? "all");
  const [customerId, setCustomerId] = useState<string | undefined>(filters.customerId);
  const [customerName, setCustomerName] = useState<string | undefined>(filters.customerName);
  const [branchId, setBranchId] = useState<string | undefined>(filters.branchId);
  const [orderId, setOrderId] = useState<string | undefined>(filters.orderId);
  const [orderNumber, setOrderNumber] = useState<string | undefined>(filters.orderNumber);
  const [issuedFrom, setIssuedFrom] = useState(filters.issuedFrom ?? "");
  const [issuedTo, setIssuedTo] = useState(filters.issuedTo ?? "");

  function handleOpenChange(next: boolean) {
    if (next) {
      setStatus(filters.status ?? "all");
      setCustomerId(filters.customerId);
      setCustomerName(filters.customerName);
      setBranchId(filters.branchId);
      setOrderId(filters.orderId);
      setOrderNumber(filters.orderNumber);
      setIssuedFrom(filters.issuedFrom ?? "");
      setIssuedTo(filters.issuedTo ?? "");
    }
    setOpen(next);
  }

  function handleApply() {
    onApply({
      status: status === "all" ? undefined : status,
      customerId,
      customerName,
      branchId,
      orderId,
      orderNumber,
      issuedFrom: issuedFrom || undefined,
      issuedTo: issuedTo || undefined,
    });
    setOpen(false);
  }

  function handleReset() {
    setStatus("all");
    setCustomerId(undefined);
    setCustomerName(undefined);
    setBranchId(undefined);
    setOrderId(undefined);
    setOrderNumber(undefined);
    setIssuedFrom("");
    setIssuedTo("");
    onApply({
      status: undefined,
      customerId: undefined,
      customerName: undefined,
      branchId: undefined,
      orderId: undefined,
      orderNumber: undefined,
      issuedFrom: undefined,
      issuedTo: undefined,
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
          <SheetTitle>فلاتر الفواتير</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 overflow-y-auto px-4">
          <div className="space-y-1.5">
            <Label>الحالة</Label>
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
                {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          </div>

          <div className="space-y-1.5">
            <Label>الفرع</Label>
            <Select
              value={branchId ?? "all"}
              onValueChange={(v) => setBranchId(!v || v === "all" ? undefined : v)}
              items={{ all: "الكل", ...Object.fromEntries((branches ?? []).map((b) => [b.id, b.name])) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {(branches ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Label htmlFor="invoice-filter-issued-from">من تاريخ الإصدار</Label>
            <Input
              id="invoice-filter-issued-from"
              type="date"
              value={issuedFrom}
              onChange={(e) => setIssuedFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invoice-filter-issued-to">إلى تاريخ الإصدار</Label>
            <Input
              id="invoice-filter-issued-to"
              type="date"
              value={issuedTo}
              onChange={(e) => setIssuedTo(e.target.value)}
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
