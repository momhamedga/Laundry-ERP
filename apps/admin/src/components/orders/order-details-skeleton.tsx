import { Skeleton } from "@/components/ui/skeleton";

export function OrderDetailsSkeleton() {
  return (
    <div className="space-y-4 px-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-20 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}
