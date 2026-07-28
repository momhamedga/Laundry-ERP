import type { Metadata } from "next";
import { Suspense } from "react";
import { BackupView } from "@/components/backup/backup-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "النسخ الاحتياطي" };

function BackupPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<BackupPageSkeleton />}>
      <BackupView />
    </Suspense>
  );
}
