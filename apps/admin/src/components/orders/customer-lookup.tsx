"use client";

import { Search } from "lucide-react";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useCustomerLookupQuery } from "@/hooks/use-customer-lookup";
import { getErrorMessage } from "@/lib/axios";
import type { Customer } from "@/types/customer";
import { CustomerLookupSkeleton } from "./customer-lookup-skeleton";

interface CustomerLookupProps {
  onSelect: (customer: Customer) => void;
}

/**
 * بحث خادمي فقط (Server Side) عن عميل بالاسم أو الهاتف - خطوة اختيار
 * العميل بمعالج إنشاء الطلب. يعيد استخدام useCustomerLookupQuery
 * وcustomers.service.ts الموجودين مسبقاً بلا أي استدعاء Axios مباشر.
 */
export function CustomerLookup({ onSelect }: CustomerLookupProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isFetching, isError, error } = useCustomerLookupQuery(debouncedQuery);

  function handleChange(next: string) {
    setQuery(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(next), 400);
  }

  const showResults = debouncedQuery.trim().length >= 2;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الهاتف..."
          aria-label="بحث عن عميل"
          className="ps-9"
          autoFocus
        />
      </div>

      {!showResults && (
        <p className="px-1 text-xs text-muted-foreground">
          اكتب حرفين على الأقل من الاسم أو الهاتف
        </p>
      )}

      {showResults && (
        <div
          role="listbox"
          aria-label="نتائج البحث عن العملاء"
          className="max-h-64 space-y-0.5 overflow-y-auto rounded-lg border p-1"
        >
          {isFetching ? (
            <CustomerLookupSkeleton />
          ) : isError ? (
            <p role="alert" className="px-2 py-3 text-center text-xs text-destructive">
              {getErrorMessage(error)}
            </p>
          ) : data && data.customers.length > 0 ? (
            data.customers.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => onSelect(c)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span className="font-medium">{c.name}</span>
                <span dir="ltr" className="text-xs text-muted-foreground">
                  {c.phone}
                </span>
              </button>
            ))
          ) : (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              لا يوجد عميل مطابق
            </p>
          )}
        </div>
      )}
    </div>
  );
}
