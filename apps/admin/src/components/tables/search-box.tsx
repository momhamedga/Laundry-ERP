"use client";

import { Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface SearchBoxProps {
  defaultValue: string;
  onSearch: (value: string) => void;
  placeholder?: string;
}

/**
 * بحث خادمي مؤجَّل (Debounce) - مكوّن عام قابل لإعادة الاستخدام عبر كل الوحدات
 * بلا Effects لتفادي مشاكل الحلقات (setTimeout يدوي داخل معالج الحدث)
 */
export function SearchBox({ defaultValue, onSearch, placeholder = "بحث..." }: SearchBoxProps) {
  const [value, setValue] = useState(defaultValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(next: string) {
    setValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(next), 400);
  }

  function handleClear() {
    setValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch("");
  }

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label="بحث"
        className="w-full ps-9 sm:w-64"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="مسح البحث"
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
