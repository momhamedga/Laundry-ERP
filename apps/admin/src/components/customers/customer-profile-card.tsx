"use client";

import { Calendar, Mail, MapPin, Phone, RotateCcw, Trash2, UserPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDate } from "@/lib/format";
import type { Customer } from "@/types/customer";
import { CustomerStatusBadge } from "./customer-status-badge";

interface CustomerProfileCardProps {
  customer: Customer;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
}

/** بيانات العميل الأساسية + إجراءات التعديل/التعطيل/الاستعادة حسب الصلاحيات */
export function CustomerProfileCard({
  customer,
  onEdit,
  onDelete,
  onRestore,
}: CustomerProfileCardProps) {
  const { can, hasRole } = usePermissions();
  const canManage = can("customers:manage");
  const canDeleteRestore = hasRole("ADMIN", "MANAGER");

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{customer.name}</CardTitle>
            <CustomerStatusBadge isActive={customer.isActive} />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5" aria-hidden /> عميل منذ {formatDate(customer.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {canManage && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <UserPen aria-hidden /> تعديل
            </Button>
          )}
          {canDeleteRestore &&
            (customer.isActive ? (
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 aria-hidden /> تعطيل
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onRestore}>
                <RotateCcw aria-hidden /> استعادة
              </Button>
            ))}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="size-4 text-muted-foreground" aria-hidden />
          <span dir="ltr">{customer.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Mail className="size-4 text-muted-foreground" aria-hidden />
          <span dir="ltr">{customer.email ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm sm:col-span-2">
          <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>{customer.address ?? "—"}</span>
        </div>
      </CardContent>
    </Card>
  );
}
