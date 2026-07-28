import { Skeleton } from "@/components/ui/skeleton";

export function ChangePasswordSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-96 max-w-lg rounded-xl" />
    </div>
  );
}
