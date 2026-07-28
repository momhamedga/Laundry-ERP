import { Skeleton } from "@/components/ui/skeleton";

export function CustomersListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
