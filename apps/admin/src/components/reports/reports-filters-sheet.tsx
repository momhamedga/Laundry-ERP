"use client";

import { Filter } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ReportsFiltersSheetProps {
  title: string;
  activeCount: number;
  /** يُستدعى عند فتح الـ Sheet - لمزامنة حقول المسودة الداخلية بكل تقرير مع الفلاتر المُطبَّقة فعلياً */
  onOpen: () => void;
  onApply: () => void;
  onReset: () => void;
  children: React.ReactNode;
}

/**
 * غلاف Sheet عام لفلاتر أي تقرير - كل تقرير يمرر حقوله الخاصة (مسودة محلية
 * لديه) كـ children، ويُطبِّق/يمسح عبر onApply/onReset الممرَّرين من الأب
 * (نفس نمط PaymentsFiltersSheet لكن معمَّم بلا تكرار الغلاف ست مرات)
 */
export function ReportsFiltersSheet({
  title,
  activeCount,
  onOpen,
  onApply,
  onReset,
  children,
}: ReportsFiltersSheetProps) {
  const [open, setOpen] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) onOpen();
    setOpen(next);
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
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 overflow-y-auto px-4">{children}</div>
        <SheetFooter className="flex-row">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onReset();
              setOpen(false);
            }}
          >
            مسح
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onApply();
              setOpen(false);
            }}
          >
            تطبيق
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
