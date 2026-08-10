"use client";

import { FileText, Loader2, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useCustomersQuery } from "@/hooks/use-customers";
import { useOrdersQuery } from "@/hooks/use-orders";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/** أقصى ما يُعرَض من كل نوع — القائمة أداة وصول سريع لا صفحة نتائج */
const PER_TYPE = 4;
/** تأخير قبل الطلب: كتابة رقم هاتف من 11 رقماً تعني 11 طلباً بلا هذا */
const DEBOUNCE_MS = 300;
/** أقصر مدخل يستحقّ طلب شبكة */
const MIN_QUERY = 2;

/**
 * البحث السريع في الترويسة.
 *
 * كان `<Input placeholder="بحث سريع...">` بلا onChange ولا حالة ولا معالج —
 * عنصرٌ شكليّ بالكامل. الموظّف يكتب فيه ولا يحدث شيء، وهو تحديداً نوع الخلل
 * الذي يجعله يقول «النظام مش شغال» ولا يبلّغ عن شيء محدّد.
 *
 * يبحث في العملاء والطلبات معاً: في مغسلة، المدخل المتاح غالباً رقم هاتف أو
 * رقم طلب، ولا يعرف الموظّف (ولا يجب أن يهتمّ) أيّ صفحة تخصّ أيّاً منهما.
 * الصلاحيات تُحترم — من لا يملك `customers:read` لا يرى نتائج عملاء أصلاً.
 */
export function QuickSearch() {
  const router = useRouter();
  const { can } = usePermissions();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  const enabled = debounced.length >= MIN_QUERY;
  const canCustomers = can("customers:read");
  const canOrders = can("orders:read");

  const customersQuery = useCustomersQuery(
    enabled && canCustomers ? { search: debounced, limit: PER_TYPE } : { limit: PER_TYPE },
  );
  const ordersQuery = useOrdersQuery(
    enabled && canOrders ? { search: debounced, limit: PER_TYPE } : { limit: PER_TYPE },
  );

  const customers = enabled && canCustomers ? (customersQuery.data?.customers ?? []) : [];
  const orders = enabled && canOrders ? (ordersQuery.data?.orders ?? []) : [];
  const loading = enabled && (customersQuery.isFetching || ordersQuery.isFetching);

  type Hit = { key: string; href: string; icon: typeof User; title: string; subtitle: string };
  const hits: Hit[] = [
    ...customers.slice(0, PER_TYPE).map((c) => ({
      key: `c-${c.id}`,
      href: `/customers/${c.id}`,
      icon: User,
      title: c.name,
      subtitle: c.phone,
    })),
    ...orders.slice(0, PER_TYPE).map((o) => ({
      key: `o-${o.id}`,
      href: `/orders?search=${encodeURIComponent(o.orderNumber)}`,
      icon: FileText,
      title: o.orderNumber,
      subtitle: `${o.customer?.name ?? ""} · ${formatCurrency(o.total)}`,
    })),
  ];

  // إغلاق عند النقر خارج المكوّن — القائمة تطفو فوق الصفحة
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  /** Ctrl+K / Cmd+K للتركيز — الكاشير يعمل بيد واحدة والأخرى تستلم غسيلاً */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  /**
   * تصفير المؤشّر عند تغيّر النتائج مشتقٌّ لا مُخزَّن: ضبطه داخل useEffect
   * يُحدث تصييراً إضافياً بعد كل بحث بلا داع. نحصر الفهرس في المدى بدلاً من ذلك.
   */
  const selectedIndex = activeIndex < hits.length ? activeIndex : 0;

  function go(hit: Hit) {
    setOpen(false);
    setTerm("");
    router.push(hit.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((selectedIndex + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((selectedIndex - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[selectedIndex];
      if (hit) go(hit);
    }
  }

  const showPanel = open && enabled;

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <Search
        className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="search"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="بحث سريع… (Ctrl+K)"
        aria-label="بحث عن عميل أو طلب"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="quick-search-results"
        className="w-48 ps-9 lg:w-64"
      />
      {loading && (
        <Loader2
          className="absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-hidden
        />
      )}

      {showPanel && (
        <div
          id="quick-search-results"
          role="listbox"
          className="absolute end-0 top-full z-50 mt-1.5 w-80 overflow-hidden rounded-lg border bg-popover shadow-lg"
        >
          {hits.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              {loading ? "جارٍ البحث…" : "لا نتائج"}
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {hits.map((hit, index) => {
                const Icon = hit.icon;
                return (
                  <li key={hit.key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === selectedIndex}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => go(hit)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm",
                        index === selectedIndex && "bg-accent text-accent-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{hit.title}</span>
                        <span className="block truncate text-xs text-muted-foreground" dir="auto">
                          {hit.subtitle}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
