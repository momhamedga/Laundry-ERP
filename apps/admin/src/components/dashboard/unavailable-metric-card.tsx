import { Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface UnavailableMetricCardProps {
  title: string;
  description: string;
}

/**
 * حالة صادقة لمقياس غير متاح بالخادم حالياً - لا بيانات وهمية أو تقريبية.
 * GET /stats/dashboard لا يعيد تجميعاً على مستوى الخدمة/التصنيف، ولا يوجد
 * Endpoint آخر يوفره بتكلفة معقولة (يتطلب endpoint تجميعي جديد بالخادم -
 * خارج نطاق هذه المرحلة: "استخدم فقط Dashboard Stats API الحالية")
 */
export function UnavailableMetricCard({ title, description }: UnavailableMetricCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
          <Info className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            هذا المقياس يتطلب تجميعاً إحصائياً غير متوفر بواجهة Dashboard Stats API الحالية
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
