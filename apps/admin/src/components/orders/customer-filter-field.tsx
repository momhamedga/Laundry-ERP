"use client";

import { Check, Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useCustomerLookupQuery } from "@/hooks/use-customer-lookup";

interface CustomerFilterFieldProps {
  customerId: string | undefined;
  customerName: string | undefined;
  onSelect: (customerId: string | undefined, customerName: string | undefined) => void;
}

/**
 * فلتر العميل - بحث مؤجَّل (Debounce) بالاسم/الهاتف عبر customers.service.ts
 * الموجود مسبقاً، مع قائمة نتائج مضمَّنة (بلا Popover لتفادي إضافة مكتبة جديدة)
 */
export function CustomerFilterField({
  customerId,
  customerName,
  onSelect,
}: CustomerFilterFieldProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isFetching } = useCustomerLookupQuery(debouncedQuery);

  function handleChange(next: string) {
    setQuery(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(next), 400);
  }

  function handleSelect(id: string, name: string) {
    onSelect(id, name);
    setQuery("");
    setDebouncedQuery("");
  }

  function handleClear() {
    onSelect(undefined, undefined);
    setQuery("");
    setDebouncedQuery("");
  }

  const showResults = debouncedQuery.trim().length >= 2;

  return (
    <div className="space-y-2">
      {customerId && customerName ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-accent/50 px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <Check className="size-3.5 text-success" aria-hidden /> {customerName}
          </span>
          <button
            type="button"
            onClick={handleClear}
            aria-label="إزالة اختيار العميل"
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="ابحث بالاسم أو الهاتف..."
            aria-label="بحث عن عميل"
            className="ps-9"
          />
        </div>
      )}

      {showResults && !customerId && (
        <div
          role="listbox"
          aria-label="نتائج البحث عن العملاء"
          className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border p-1"
        >
          {isFetching ? (
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
              <Spinner className="size-3.5" /> جارٍ البحث...
            </div>
          ) : data && data.customers.length > 0 ? (
            data.customers.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => handleSelect(c.id, c.name)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent"
              >
                <span className="font-medium">{c.name}</span>
                <span dir="ltr" className="text-xs text-muted-foreground">
                  {c.phone}
                </span>
              </button>
            ))
          ) : (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">لا نتائج</p>
          )}
        </div>
      )}
    </div>
  );
}
