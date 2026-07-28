import { Skeleton } from "@/components/ui/skeleton";

export function BranchDetailsSkeleton() {
  return (
    <div className="space-y-4 px-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
  );
}
