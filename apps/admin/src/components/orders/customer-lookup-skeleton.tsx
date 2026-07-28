import { Skeleton } from "@/components/ui/skeleton";

export function CustomerLookupSkeleton() {
  return (
    <div className="space-y-1.5 p-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-9 rounded-md" />
      ))}
    </div>
  );
}
