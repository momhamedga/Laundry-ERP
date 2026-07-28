import { QueryClient } from "@tanstack/react-query";

/** إعدادات TanStack Query الافتراضية للوحة */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
