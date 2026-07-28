import { Skeleton } from "@/components/ui/skeleton";

interface ReportsSkeletonProps {
  /** عدد بطاقات الملخص المتوقعة لهذا التقرير - Orders/Payments/Customers لها summary حقيقي، الباقي بطاقة إجمالي واحدة من meta.total */
  summaryCards?: number;
}

/** هيكل تحميل أول مرة لأي تقرير (بلا بيانات مُخزَّنة بعد) - داخل كل *-report-view.tsx */
export function ReportsSkeleton({ summaryCards = 3 }: ReportsSkeletonProps) {
  return (
    <div className="space-y-6">
      {summaryCards > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: summaryCards }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
