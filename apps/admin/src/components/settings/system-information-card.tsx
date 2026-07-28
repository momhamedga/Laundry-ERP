"use client";

import { Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useDownloadBackupMutation } from "@/hooks/use-settings";
import type { SystemInfo } from "@/types/settings";

interface SystemInformationCardProps {
  system: SystemInfo;
  /** settings:manage فقط بالخادم - يُخفى الزر تماماً بدونها (نفس نمط باقي الصفحة) */
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

/** قراءة فقط بالكامل - محسوبة من بيئة تشغيل الخادم، لا حقل قابل للتعديل هنا أصلاً */
export function SystemInformationCard({ system, canManage }: SystemInformationCardProps) {
  const backupMutation = useDownloadBackupMutation();

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
        <InfoRow
          label="تاريخ البناء"
          value={system.buildDate ?? "غير متاح (لا آلية بناء تُثبِّته حالياً)"}
        />
      </CardContent>
      {canManage && (
        <CardFooter className="flex-col items-start gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => backupMutation.mutate()}
            disabled={backupMutation.isPending}
          >
            {backupMutation.isPending ? <Spinner /> : <Download aria-hidden />}
            تنزيل نسخة احتياطية كاملة
          </Button>
          <p className="text-xs text-muted-foreground">
            يُنزَّل ملف JSON فوراً لجهازك (كل بيانات العمل الحقيقية بلا كلمات سر) - بلا حفظ أي
            نسخة على الخادم.
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
