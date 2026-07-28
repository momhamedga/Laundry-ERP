import { Skeleton } from "@/components/ui/skeleton";

export function ForgotPasswordSkeleton() {
  return (
    <main className="w-full max-w-sm">
      <div className="mb-6 flex justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="space-y-4 rounded-xl border p-6">
        <Skeleton className="mx-auto h-6 w-48" />
        <Skeleton className="mx-auto h-4 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </main>
  );
}
