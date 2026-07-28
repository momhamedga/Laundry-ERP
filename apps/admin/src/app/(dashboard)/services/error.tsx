"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

/** حدود خطأ على مستوى المسار - تلتقط أخطاء العرض غير المتوقعة */
export default function ServicesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="حدث خطأ في تحميل صفحة الخدمات"
      description={error.message}
      onRetry={reset}
    />
  );
}
