import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

interface UserSessionsCardProps {
  activeSessions: number;
  lastLoginAt: string | null;
}

/**
 * الخادم لا يعيد قائمة جلسات مفصَّلة (جهاز/IP/انتهاء) - فقط عدد الجلسات
 * النشطة وآخر دخول (GET /users/:id). لا تُعرض قائمة وهمية - العدد فقط
 * هو "قائمة الجلسات كما يعيدها الخادم" الصادقة هنا
 */
export function UserSessionsCard({ activeSessions, lastLoginAt }: UserSessionsCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <ShieldCheck className="size-4" aria-hidden /> الجلسات
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        <div className="flex items-center justify-between py-1.5 text-sm">
          <span className="text-muted-foreground">الجلسات النشطة</span>
          <span className="font-semibold tabular-nums">{activeSessions}</span>
        </div>
        <div className="flex items-center justify-between py-1.5 text-sm">
          <span className="text-muted-foreground">آخر تسجيل دخول</span>
          <span className="font-medium">{formatDateTime(lastLoginAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
