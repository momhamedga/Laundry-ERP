"use client";

import { Check, Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useOrderLookupQuery } from "@/hooks/use-order-lookup";

interface OrderFilterFieldProps {
  orderId: string | undefined;
  orderNumber: string | undefined;
  onSelect: (orderId: string | undefined, orderNumber: string | undefined) => void;
}

/**
 * فلتر الطلب - بحث مؤجَّل برقم الطلب/اسم العميل عبر orders.service.ts الموجود
 * (نفس نمط CustomerFilterField الخاص بالطلبات، منقول هنا بلا تعديل الأصل)
 */
export function OrderFilterField({ orderId, orderNumber, onSelect }: OrderFilterFieldProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isFetching } = useOrderLookupQuery(debouncedQuery);

  function handleChange(next: string) {
    setQuery(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(next), 400);
  }

  function handleSelect(id: string, number: string) {
    onSelect(id, number);
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
      {orderId && orderNumber ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-accent/50 px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 font-medium" dir="ltr">
            <Check className="size-3.5 text-success" aria-hidden /> {orderNumber}
          </span>
          <button
            type="button"
            onClick={handleClear}
            aria-label="إزالة اختيار الطلب"
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
            placeholder="ابحث برقم الطلب أو اسم العميل..."
            aria-label="بحث عن طلب"
            className="ps-9"
          />
        </div>
      )}

      {showResults && !orderId && (
        <div
          role="listbox"
          aria-label="نتائج البحث عن الطلبات"
          className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border p-1"
        >
          {isFetching ? (
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
              <Spinner className="size-3.5" /> جارٍ البحث...
            </div>
          ) : data && data.orders.length > 0 ? (
            data.orders.map((o) => (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => handleSelect(o.id, o.orderNumber)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent"
              >
                <span dir="ltr" className="font-medium">
                  {o.orderNumber}
                </span>
                <span className="text-xs text-muted-foreground">{o.customer.name}</span>
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
