import type { Metadata } from "next";
import { Suspense } from "react";
import { UsersListSkeleton } from "@/components/users/users-list-skeleton";
import { UsersView } from "@/components/users/users-view";

export const metadata: Metadata = { title: "المستخدمون" };

export default function Page() {
  return (
    <Suspense fallback={<UsersListSkeleton />}>
      <UsersView />
    </Suspense>
  );
}
