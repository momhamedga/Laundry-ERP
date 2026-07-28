import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoriesListSkeleton } from "@/components/service-categories/categories-list-skeleton";
import { CategoriesView } from "@/components/service-categories/categories-view";

export const metadata: Metadata = { title: "تصنيفات الخدمات" };

export default function ServiceCategoriesPage() {
  return (
    <Suspense fallback={<CategoriesListSkeleton />}>
      <CategoriesView />
    </Suspense>
  );
}
