import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "destructive";
  /**
   * أثناء التحميل نعرض هيكلاً عظمياً بدل القيمة. بدونه كان المستدعي يعرض "—"
   * ريثما يصل الاستعلام، فتبدو البطاقة كأن رقمها المالي مفقود — وهو ما رُصد
   * فعلاً في صفحة المدفوعات حيث وصل عدّادان قبل الآخرين.
   */
  loading?: boolean;
}

const TONE_CLASSES: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

/** بطاقة رقم بسيطة (بلا مؤشر اتجاه) - لسياقات مثل ملف عميل/طلب لا تملك مقارنة تاريخية */
export function MetricCard({ title, value, icon: Icon, tone = "default", loading = false }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            TONE_CLASSES[tone],
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-16" />
          ) : (
            <p className="text-xl font-bold tabular-nums">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
