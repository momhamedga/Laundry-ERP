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
import { UNIT_LABELS } from "@/constants/services";
import type { ServicesFilters } from "@/hooks/use-services-filters";
import type { CategoryWithCount } from "@/types/service-category";
import type { ServiceUnit } from "@/types/service";

interface ServicesFilterSheetProps {
  filters: ServicesFilters;
  onApply: (patch: Partial<ServicesFilters>) => void;
  categories: readonly CategoryWithCount[];
}

type StatusValue = "all" | "active" | "inactive";
type UnitValue = ServiceUnit | "all";

function statusToValue(isActive: boolean | undefined): StatusValue {
  if (isActive === true) return "active";
  if (isActive === false) return "inactive";
  return "all";
}

const UNITS = Object.keys(UNIT_LABELS) as ServiceUnit[];

/** فلاتر متقدمة: التصنيف/نوع التسعير/الحالة/نطاق السعر */
export function ServicesFilterSheet({ filters, onApply, categories }: ServicesFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(filters.categoryId ?? "all");
  const [unit, setUnit] = useState<UnitValue>(filters.unit ?? "all");
  const [status, setStatus] = useState<StatusValue>(statusToValue(filters.isActive));
  const [minPrice, setMinPrice] = useState(filters.minPrice?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice?.toString() ?? "");

  const activeCount = [
    filters.categoryId,
    filters.unit,
    filters.isActive !== undefined,
    filters.minPrice !== undefined,
    filters.maxPrice !== undefined,
  ].filter(Boolean).length;

  function handleOpenChange(next: boolean) {
    if (next) {
      setCategoryId(filters.categoryId ?? "all");
      setUnit(filters.unit ?? "all");
      setStatus(statusToValue(filters.isActive));
      setMinPrice(filters.minPrice?.toString() ?? "");
      setMaxPrice(filters.maxPrice?.toString() ?? "");
    }
    setOpen(next);
  }

  function handleApply() {
    onApply({
      categoryId: categoryId === "all" ? undefined : categoryId,
      unit: unit === "all" ? undefined : unit,
      isActive: status === "all" ? undefined : status === "active",
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
    setOpen(false);
  }

  function handleReset() {
    setCategoryId("all");
    setUnit("all");
    setStatus("all");
    setMinPrice("");
    setMaxPrice("");
    onApply({
      categoryId: undefined,
      unit: undefined,
      isActive: undefined,
      minPrice: undefined,
      maxPrice: undefined,
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
          <SheetTitle>فلاتر الخدمات</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <div className="space-y-1.5">
            <Label>التصنيف</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => setCategoryId(v ?? "all")}
              items={{ all: "الكل", ...Object.fromEntries(categories.map((cat) => [cat.id, cat.name])) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>نوع التسعير</Label>
            <Select
              value={unit}
              onValueChange={(v) => setUnit(v as UnitValue)}
              items={{ all: "الكل", ...UNIT_LABELS }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>الحالة</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as StatusValue)}
              items={{ all: "الكل", active: "نشطة", inactive: "معطلة" }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشطة</SelectItem>
                <SelectItem value="inactive">معطلة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="filter-min-price">أقل سعر</Label>
              <Input
                id="filter-min-price"
                type="number"
                min="0"
                dir="ltr"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-max-price">أعلى سعر</Label>
              <Input
                id="filter-max-price"
                type="number"
                min="0"
                dir="ltr"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
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
