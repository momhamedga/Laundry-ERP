import { Skeleton } from "@/components/ui/skeleton";

export function SessionsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
