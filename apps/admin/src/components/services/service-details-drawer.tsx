"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Service } from "@/types/service";
import { ServiceStatusBadge } from "./service-status-badge";
import { UnitBadge } from "./unit-badge";

interface ServiceDetailsDrawerProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

export function ServiceDetailsDrawer({ service, open, onOpenChange }: ServiceDetailsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-96">
        <SheetHeader>
          <SheetTitle>{service?.name ?? "تفاصيل الخدمة"}</SheetTitle>
          {service?.description && <SheetDescription>{service.description}</SheetDescription>}
        </SheetHeader>
        {service && (
          <div className="divide-y px-4">
            <Row label="الحالة">
              <ServiceStatusBadge service={service} />
            </Row>
            <Row label="التصنيف">{service.category.name}</Row>
            <Row label="نوع التسعير">
              <UnitBadge unit={service.unit} />
            </Row>
            <Row label="السعر">{formatCurrency(service.price)}</Row>
            <Row label="مدة التنفيذ">
              {service.estimatedHours ? `${service.estimatedHours} ساعة` : "—"}
            </Row>
            <Row label="ترتيب العرض">{service.sortOrder}</Row>
            <Row label="تاريخ الإنشاء">{formatDateTime(service.createdAt)}</Row>
            <Row label="آخر تحديث">{formatDateTime(service.updatedAt)}</Row>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
