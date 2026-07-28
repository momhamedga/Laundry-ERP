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
import type { CustomersFilters } from "@/hooks/use-customers-filters";

interface FilterSheetProps {
  filters: CustomersFilters;
  onApply: (patch: Partial<CustomersFilters>) => void;
  activeCount: number;
}

type StatusValue = "all" | "active" | "inactive";

function statusToValue(isActive: boolean | undefined): StatusValue {
  if (isActive === true) return "active";
  if (isActive === false) return "inactive";
  return "all";
}

/** فلاتر متقدمة: الحالة + فترة تاريخ التسجيل - تُطبَّق عند الضغط على "تطبيق" */
export function FilterSheet({ filters, onApply, activeCount }: FilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<StatusValue>(statusToValue(filters.isActive));
  const [createdFrom, setCreatedFrom] = useState(filters.createdFrom ?? "");
  const [createdTo, setCreatedTo] = useState(filters.createdTo ?? "");

  function handleOpenChange(next: boolean) {
    if (next) {
      // إعادة مزامنة القيم المحلية مع الفلاتر الفعلية عند كل فتح
      setStatus(statusToValue(filters.isActive));
      setCreatedFrom(filters.createdFrom ?? "");
      setCreatedTo(filters.createdTo ?? "");
    }
    setOpen(next);
  }

  function handleApply() {
    onApply({
      isActive: status === "all" ? undefined : status === "active",
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
    });
    setOpen(false);
  }

  function handleReset() {
    setStatus("all");
    setCreatedFrom("");
    setCreatedTo("");
    onApply({ isActive: undefined, createdFrom: undefined, createdTo: undefined });
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
          <SheetTitle>فلاتر العملاء</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <div className="space-y-1.5">
            <Label>الحالة</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as StatusValue)}
              items={{ all: "الكل", active: "نشط", inactive: "معطل" }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">معطل</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-created-from">تاريخ التسجيل من</Label>
            <Input
              id="filter-created-from"
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-created-to">تاريخ التسجيل إلى</Label>
            <Input
              id="filter-created-to"
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
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
