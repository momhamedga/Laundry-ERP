"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportsToolbarProps {
  children: React.ReactNode;
  hasActiveFilters: boolean;
  onReset: () => void;
}

/** شريط أدوات عام لكل تقارير Reports - يعرض عناصر الفلترة/الفرز الخاصة بكل تقرير كـ children + زر مسح موحّد */
export function ReportsToolbar({ children, hasActiveFilters, onReset }: ReportsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X aria-hidden /> مسح الكل
        </Button>
      )}
    </div>
  );
}
