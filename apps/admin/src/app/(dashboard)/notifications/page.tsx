import type { Metadata } from "next";
import { Suspense } from "react";
import { NotificationsView } from "@/components/notifications/notifications-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "الإشعارات" };

function NotificationsPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<NotificationsPageSkeleton />}>
      <NotificationsView />
    </Suspense>
  );
}
