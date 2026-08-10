"use client";

import { DatabaseBackup, Info } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { SystemInfo } from "@/types/settings";

interface SystemInformationCardProps {
  system: SystemInfo;
  /** backup:read بالخادم - يُخفى الرابط تماماً بدونها (نفس نمط باقي الصفحة) */
  canManage: boolean;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/**
 * قراءة فقط بالكامل - محسوبة من بيئة تشغيل الخادم، لا حقل قابل للتعديل هنا أصلاً.
 *
 * حُذف من هنا زرّ «تنزيل نسخة احتياطية كاملة»: كان ينادي GET /backup فيبني نفس
 * الحمولة ثم يرسلها للمتصفّح بلا حفظ ولا تسجيل ولا بصمة. مجموعةٌ جزئية من صفحة
 * النسخ الاحتياطي، وأخطر من ذلك أنه مضلِّل — من يضغطه يرى ملفاً ينزل فيظنّ أنه
 * «أخذ نسخة احتياطية»، ولا شيء حُفظ في الواقع. صار الكارت يشير إلى الصفحة الوحيدة
 * المسؤولة عن ذلك بدل أن ينافسها.
 *
 * وحُذف صفّ «تاريخ البناء»: الخادم يُرجعه null دائماً (settings.utils.ts) لعدم
 * وجود آلية بناء تُثبّته، فكان صفّاً يشغل مساحة ولا يقول شيئاً.
 */
export function SystemInformationCard({ system, canManage }: SystemInformationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Info className="size-4" aria-hidden /> معلومات النظام
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y-0">
        <InfoRow label="اسم التطبيق" value={system.applicationName} />
        <InfoRow label="الإصدار" value={<span dir="ltr">{system.applicationVersion}</span>} />
        <InfoRow label="بيئة التشغيل" value={<span dir="ltr">{system.environment}</span>} />
      </CardContent>
      {canManage && (
        <CardFooter className="flex-col items-start gap-2 border-t pt-4">
          <Link href="/backup" className={buttonVariants({ variant: "outline" })}>
            <DatabaseBackup aria-hidden /> إدارة النسخ الاحتياطي
          </Link>
          <p className="text-xs text-muted-foreground">
            إنشاء نسخة محفوظة على الخادم، أو جدولتها، أو الاستعادة من نسخة سابقة.
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
