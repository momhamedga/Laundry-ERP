"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * true بعد أول render على العميل - لتجنب أخطاء الـ Hydration (Theme...)
 * useSyncExternalStore: يعيد false في SSR وtrue على العميل بلا setState في effect
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
