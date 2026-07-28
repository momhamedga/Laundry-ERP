"use client";

import { History } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserActivityQuery } from "@/hooks/use-users";
import { getErrorMessage } from "@/lib/axios";
import { formatDateTime } from "@/lib/format";
import type { AuditAction } from "@/types/user";

const ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN_SUCCESS: "تسجيل دخول ناجح",
  LOGIN_FAILED: "محاولة دخول فاشلة",
  LOGOUT: "تسجيل خروج",
  TOKEN_REFRESHED: "تجديد الجلسة",
  TOKEN_REUSE_DETECTED: "اكتشاف إعادة استخدام رمز مشبوهة",
  ACCOUNT_LOCKED: "قفل الحساب",
  PASSWORD_CHANGED: "تغيير كلمة السر",
  PASSWORD_RESET_REQUESTED: "طلب استعادة كلمة السر",
  PASSWORD_RESET_COMPLETED: "اكتملت استعادة كلمة السر",
  SESSION_REVOKED: "إبطال جلسة",
  PAYMENT_CREATED: "تسجيل دفعة",
  PAYMENT_UPDATED: "تعديل دفعة",
  PAYMENT_REFUNDED: "استرداد دفعة",
  PAYMENT_CANCELLED: "إلغاء دفعة",
};

/** سجل النشاط - GET /users/:id/activity (يتطلب صلاحية audit:read منفصلة عن users:read) */
export function UserActivityTimeline({ userId }: { userId: string }) {
  const { data, isLoading, isError, error, refetch } = useUserActivityQuery(userId, {
    page: 1,
    limit: 20,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState description={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  if (!data || data.activity.length === 0) {
    return <EmptyState icon={History} title="لا يوجد نشاط مسجَّل بعد" />;
  }

  return (
    <ol className="space-y-4 border-e-2 border-border ps-4">
      {data.activity.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            className="absolute -end-[1.4rem] top-1 size-2.5 rounded-full bg-primary"
            aria-hidden
          />
          <p className="text-sm font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(entry.createdAt)}
            {entry.ipAddress && <span dir="ltr"> · {entry.ipAddress}</span>}
          </p>
        </li>
      ))}
    </ol>
  );
}
