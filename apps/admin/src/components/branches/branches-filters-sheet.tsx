"use client";

import { Filter } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import type { BranchesFilters } from "@/hooks/use-branches-filters";

interface BranchesFiltersSheetProps {
  filters: BranchesFilters;
  onApply: (patch: Partial<BranchesFilters>) => void;
  activeCount: number;
}

type StatusValue = "all" | "active" | "inactive";

function statusToValue(isActive: boolean | undefined): StatusValue {
  if (isActive === true) return "active";
  if (isActive === false) return "inactive";
  return "all";
}

/** فلتر الحالة فقط - المطلوب صراحةً بمواصفة هذه المرحلة */
export function BranchesFiltersSheet({ filters, onApply, activeCount }: BranchesFiltersSheetProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<StatusValue>(statusToValue(filters.isActive));

  function handleOpenChange(next: boolean) {
    if (next) setStatus(statusToValue(filters.isActive));
    setOpen(next);
  }

  function handleApply() {
    onApply({ isActive: status === "all" ? undefined : status === "active" });
    setOpen(false);
  }

  function handleReset() {
    setStatus("all");
    onApply({ isActive: undefined });
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
          <SheetTitle>فلاتر الفروع</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 overflow-y-auto px-4">
          <div className="space-y-1.5">
            <Label>الحالة</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus((v as StatusValue) ?? "all")}
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
