"use client";

import { Clock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceStatusBadge } from "@/components/services/service-status-badge";
import { UnitBadge } from "@/components/services/unit-badge";
import { formatCurrency } from "@/lib/format";
import type { Service } from "@/types/service";

interface ServiceCardProps {
  service: Service;
  /** عدد مرات وجودها الحالي بالبنود المختارة - لا يمنع الإضافة مجدداً */
  selectedCount: number;
  onAdd: (service: Service) => void;
}

/** بطاقة خدمة بنتائج البحث - الاسم/التصنيف/نوع التسعير/السعر/المدة/الحالة */
export function ServiceCard({ service, selectedCount, onAdd }: ServiceCardProps) {
  const disabled = !service.available;

  return (
    <Card className={disabled ? "opacity-60" : undefined}>
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-medium">{service.name}</p>
            {selectedCount > 0 && (
              <Badge variant="outline" className="text-[10px]">
                ×{selectedCount} بالطلب
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{service.category.name}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <UnitBadge unit={service.unit} />
            <ServiceStatusBadge service={service} />
            {service.estimatedHours && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" aria-hidden /> {service.estimatedHours} س
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="font-semibold tabular-nums">{formatCurrency(service.price)}</span>
          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onAdd(service)}
            aria-label={`إضافة ${service.name} للطلب`}
          >
            <Plus aria-hidden /> إضافة
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
