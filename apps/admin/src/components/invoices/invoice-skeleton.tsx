import { Skeleton } from "@/components/ui/skeleton";

interface InvoiceSkeletonProps {
  /** list = هيكل صفحة القائمة الكاملة (بطاقات+شريط أدوات+جدول)، details = هيكل لوحة تفاصيل الفاتورة */
  variant?: "list" | "details";
}

/** هيكل تحميل موحّد لصفحة القائمة أو لوحة التفاصيل - قبل وصول أي بيانات حقيقية */
export function InvoiceSkeleton({ variant = "list" }: InvoiceSkeletonProps) {
  if (variant === "details") {
    return (
      <div className="space-y-4 px-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
