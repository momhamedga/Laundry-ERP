"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { titleForPath } from "@/constants/navigation";

/** مسار التنقل الحالي - يُشتق من الـ pathname */
export function Breadcrumbs() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {isHome ? (
            <BreadcrumbPage>لوحة التحكم</BreadcrumbPage>
          ) : (
            <BreadcrumbLink href="/">لوحة التحكم</BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {!isHome && (
          <>
            <BreadcrumbSeparator className="rtl:rotate-180" />
            <BreadcrumbItem>
              <BreadcrumbPage>{titleForPath(pathname)}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
