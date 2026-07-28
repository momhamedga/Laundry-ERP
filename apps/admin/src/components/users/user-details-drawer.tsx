"use client";

import { Building2, Calendar, Mail, Phone, ShieldCheck } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import { ErrorState } from "@/components/ui/error-state";
import { Separator } from "@/components/ui/separator";
import { useActiveBranchesQuery } from "@/hooks/use-branches";
import { usePermissions } from "@/hooks/use-permissions";
import { useUserDetailQuery } from "@/hooks/use-users";
import { getErrorMessage } from "@/lib/axios";
import { formatDate } from "@/lib/format";
import { RoleBadge } from "./role-badge";
import { UserActivityTimeline } from "./user-activity-timeline";
import { UserDetailsSkeleton } from "./user-details-skeleton";
import { UserSessionsCard } from "./user-sessions-card";

interface UserDetailsDrawerProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

/** لوحة تفاصيل المستخدم - Drawer/Side Panel وليست صفحة مستقلة (نفس نمط Orders/Payments) */
export function UserDetailsDrawer({ userId, open, onOpenChange }: UserDetailsDrawerProps) {
  const { data, isLoading, isError, error, refetch } = useUserDetailQuery(userId);
  const { data: branches } = useActiveBranchesQuery();
  const { can } = usePermissions();

  const user = data?.user;
  const branchName = user?.branchId
    ? (branches?.find((b) => b.id === user.branchId)?.name ?? "فرع غير نشط")
    : "بلا فرع";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{user ? user.name : "تفاصيل المستخدم"}</SheetTitle>
          {user && (
            <SheetDescription className="flex items-center gap-2">
              <RoleBadge role={user.role} />
              <CustomerStatusBadge isActive={user.isActive} />
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <UserDetailsSkeleton />
          ) : isError ? (
            <div className="px-4">
              <ErrorState
                title="تعذر تحميل تفاصيل المستخدم"
                description={getErrorMessage(error)}
                onRetry={() => void refetch()}
              />
            </div>
          ) : user && data ? (
            <div className="space-y-5 px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow icon={Mail} label="البريد الإلكتروني" value={<span dir="ltr">{user.email}</span>} />
                <InfoRow
                  icon={Phone}
                  label="الهاتف"
                  value={user.phone ? <span dir="ltr">{user.phone}</span> : "—"}
                />
                <InfoRow icon={Building2} label="الفرع" value={branchName} />
                <InfoRow icon={ShieldCheck} label="الدور" value={<RoleBadge role={user.role} />} />
                <InfoRow icon={Calendar} label="تاريخ الإنشاء" value={formatDate(user.createdAt)} />
                <InfoRow icon={Calendar} label="آخر تحديث" value={formatDate(user.updatedAt)} />
              </div>

              <Separator />

              <UserSessionsCard
                activeSessions={data.activeSessions}
                lastLoginAt={data.lastLoginAt}
              />

              {can("audit:read") ? (
                <div>
                  <h3 className="mb-3 text-sm font-semibold">سجل النشاط</h3>
                  <UserActivityTimeline userId={user.id} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  سجل النشاط يتطلب صلاحية عرض السجلات (audit:read)
                </p>
              )}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
