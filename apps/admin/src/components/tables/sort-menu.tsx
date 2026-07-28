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

interface SortOption<T extends string> {
  field: T;
  label: string;
}

interface SortMenuProps<T extends string> {
  options: readonly SortOption<T>[];
  sortBy: T;
  sortOrder: SortOrder;
  onChange: (sortBy: T, sortOrder: SortOrder) => void;
}

/** قائمة ترتيب عامة - قابلة لإعادة الاستخدام لأي وحدة بحقول ترتيب مختلفة */
export function SortMenu<T extends string>({
  options,
  sortBy,
  sortOrder,
  onChange,
}: SortMenuProps<T>) {
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
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.field}
            onClick={() =>
              onChange(opt.field, sortBy === opt.field && sortOrder === "asc" ? "desc" : "asc")
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
