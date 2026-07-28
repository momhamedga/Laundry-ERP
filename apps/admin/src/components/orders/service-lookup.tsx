"use client";

import { Search } from "lucide-react";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/error-state";
import { useServicesQuery } from "@/hooks/use-services";
import { getErrorMessage } from "@/lib/axios";
import { useOrderDraftStore } from "@/store/order-draft-store";
import type { Service } from "@/types/service";
import { CategoryFilter } from "./category-filter";
import { ServiceCard } from "./service-card";
import { ServiceLookupSkeleton } from "./service-lookup-skeleton";

interface ServiceLookupProps {
  onAdd: (service: Service) => void;
}

/**
 * بحث + فلترة خدمات Server Side بالكامل (اسم + تصنيف) - يعيد استخدام
 * useServicesQuery وuseAllCategoriesQuery الموجودين بلا أي استدعاء Axios مباشر
 * أو بيانات ثابتة. لا يعرض إلا الخدمات النشطة (isActive=true بالاستعلام)،
 * والمعطّلة بسبب تصنيف مُعطَّل (available=false) تُعرض لكن بزر إضافة معطَّل.
 */
export function ServiceLookup({ onAdd }: ServiceLookupProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const items = useOrderDraftStore((s) => s.items);

  const { data, isLoading, isFetching, isError, error, refetch } = useServicesQuery({
    search: debouncedQuery || undefined,
    categoryId,
    isActive: true,
    limit: 20,
    sortBy: "name",
    sortOrder: "asc",
  });

  function handleChange(next: string) {
    setQuery(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(next), 400);
  }

  const loading = isLoading || isFetching;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="ابحث باسم الخدمة..."
            aria-label="بحث عن خدمة"
            className="ps-9"
          />
        </div>
        <CategoryFilter value={categoryId} onChange={setCategoryId} />
      </div>

      {loading ? (
        <ServiceLookupSkeleton />
      ) : isError ? (
        <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : data && data.services.length > 0 ? (
        <div className="space-y-2">
          {data.services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              selectedCount={items.filter((i) => i.service.id === service.id).length}
              onAdd={onAdd}
            />
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">لا توجد خدمات مطابقة</p>
      )}
    </div>
  );
}
