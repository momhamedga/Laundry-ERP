"use client";

import { ArrowDownAZ, ArrowUpAZ, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SortOrder } from "@/types";
import type { CustomerSortField } from "@/types/customer";

interface SortMenuProps {
  sortBy: CustomerSortField;
  sortOrder: SortOrder;
  onChange: (sortBy: CustomerSortField, sortOrder: SortOrder) => void;
}

const OPTIONS: { field: CustomerSortField; label: string }[] = [
  { field: "createdAt", label: "تاريخ التسجيل" },
  { field: "name", label: "الاسم" },
  { field: "phone", label: "الهاتف" },
];

/** قائمة ترتيب صريحة - بديل/مكمّل للنقر على رؤوس الأعمدة */
export function SortMenu({ sortBy, sortOrder, onChange }: SortMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline">
            {sortOrder === "asc" ? <ArrowUpAZ aria-hidden /> : <ArrowDownAZ aria-hidden />}
            ترتيب
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>ترتيب حسب</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.field}
            onClick={() =>
              onChange(
                opt.field,
                sortBy === opt.field && sortOrder === "asc" ? "desc" : "asc",
              )
            }
          >
            {sortBy === opt.field && <Check className="size-3.5" aria-hidden />}
            <span className={sortBy === opt.field ? "font-medium" : ""}>{opt.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
