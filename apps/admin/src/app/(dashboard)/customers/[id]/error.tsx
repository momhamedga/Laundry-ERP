"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

/** حدود خطأ على مستوى صفحة تفاصيل العميل */
export default function CustomerDetailsError({
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
      title="حدث خطأ في تحميل بيانات العميل"
      description={error.message}
      onRetry={reset}
    />
  );
}
