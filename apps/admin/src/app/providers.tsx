"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { armOfflineSync } from "@/lib/offline-sync-arm";
import { makeQueryClient } from "@/lib/query-client";
import { useConnectivityStore } from "@/store/connectivity-store";

/** كل مزودي التطبيق في مكان واحد: Theme + Query + Toast + مراقبة الاتصال */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  // مراقبة الاتصال + تسليح محرّك المزامنة. كلاهما محصّن ضد التكرار ويعود
  // بلا أثر خارج Electron حيث لا توجد قاعدة محلّية أصلاً.
  useEffect(() => {
    useConnectivityStore.getState().init();
    const disarm = armOfflineSync();

    /**
     * إبطال الكاش عند تبدّل الاتصال.
     *
     * بلا هذا يبقى ما جلبه React Query صالحاً في نظره، فيعرض الشاشةُ نتيجةً
     * محفوظة ولا تمرّ باستدعاء جديد — فلا يُسأل موجّه الأوفلاين إطلاقاً.
     * أثر ذلك على مستخدم حقيقي: معالج الطلب مفتوح، ينقطع الإنترنت، فيبحث
     * فيرى بيانات الدقيقة الماضية بدل أن يُقرأ من القاعدة المحلّية.
     *
     * الإبطال يجعل React Query يُعيد جلب الاستعلامات النشطة، وهذه المرة
     * يمرّ الاستدعاء بالموجّه فيختار المصدر الصحيح. ويعمل في الاتجاهين:
     * عند عودة الاتصال تُستبدل البيانات المحلّية ببيانات الخادم.
     */
    const unwatch = useConnectivityStore.subscribe((s, prev) => {
      if (s.status !== prev.status) void queryClient.invalidateQueries();
    });

    return () => {
      disarm();
      unwatch();
    };
  }, [queryClient]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            className: "!bg-card !text-card-foreground !border !border-border !shadow-lg",
            duration: 3500,
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
