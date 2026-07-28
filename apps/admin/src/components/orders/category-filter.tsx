"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAllCategoriesQuery } from "@/hooks/use-service-categories";

interface CategoryFilterProps {
  /** undefined = كل التصنيفات */
  value: string | undefined;
  onChange: (categoryId: string | undefined) => void;
}

/** فلتر تصنيف الخدمة - Server Side (يُمرَّر كـ categoryId لاستعلام الخدمات) */
export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  const { data } = useAllCategoriesQuery();
  const categories = data?.categories ?? [];

  return (
    <Select
      value={value ?? "all"}
      onValueChange={(v) => onChange(v && v !== "all" ? v : undefined)}
      items={{ all: "كل التصنيفات", ...Object.fromEntries(categories.map((cat) => [cat.id, cat.name])) }}
    >
      <SelectTrigger className="w-full sm:w-48" aria-label="التصنيف">
        <SelectValue placeholder="كل التصنيفات" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">كل التصنيفات</SelectItem>
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            {cat.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
