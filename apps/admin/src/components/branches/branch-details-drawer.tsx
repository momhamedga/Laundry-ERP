"use client";

import { Calendar, MapPin, Pencil, Phone, Power, PowerOff, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import { ErrorState } from "@/components/ui/error-state";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useBranchDetailQuery } from "@/hooks/use-branches";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import { formatDate } from "@/lib/format";
import type { Branch } from "@/types/branch";
import { ActivateBranchDialog } from "./activate-branch-dialog";
import { BranchDetailsSkeleton } from "./branch-details-skeleton";
import { DeactivateBranchDialog } from "./deactivate-branch-dialog";
import { DeleteBranchDialog } from "./delete-branch-dialog";
import { EditBranchDialog } from "./edit-branch-dialog";

interface BranchDetailsDrawerProps {
  branchId: string | null;
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

/** لوحة تفاصيل الفرع - Drawer وليست صفحة مستقلة (نفس نمط Users/Orders/Payments) */
export function BranchDetailsDrawer({ branchId, open, onOpenChange }: BranchDetailsDrawerProps) {
  const { data: branch, isLoading, isError, error, refetch } = useBranchDetailQuery(branchId);
  const { can } = usePermissions();
  const canManage = can("branches:manage");

  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [activateTarget, setActivateTarget] = useState<Branch | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{branch ? branch.name : "تفاصيل الفرع"}</SheetTitle>
            {branch && (
              <SheetDescription>
                <CustomerStatusBadge isActive={branch.isActive} />
              </SheetDescription>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <BranchDetailsSkeleton />
            ) : isError ? (
              <div className="px-4">
                <ErrorState
                  title="تعذر تحميل تفاصيل الفرع"
                  description={getErrorMessage(error)}
                  onRetry={() => void refetch()}
                />
              </div>
            ) : branch ? (
              <div className="space-y-5 px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow icon={MapPin} label="العنوان" value={branch.address ?? "—"} />
                  <InfoRow
                    icon={Phone}
                    label="الهاتف"
                    value={branch.phone ? <span dir="ltr">{branch.phone}</span> : "—"}
                  />
                  <InfoRow icon={Users} label="عدد الموظفين" value={branch.usersCount} />
                  <InfoRow icon={Users} label="عدد الطلبات" value={branch.ordersCount} />
                  <InfoRow icon={Calendar} label="تاريخ الإنشاء" value={formatDate(branch.createdAt)} />
                  <InfoRow icon={Calendar} label="آخر تحديث" value={formatDate(branch.updatedAt)} />
                </div>

                {canManage && (
                  <>
                    <Separator />
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditTarget(branch)}>
                        <Pencil aria-hidden /> تعديل
                      </Button>
                      {branch.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeactivateTarget(branch)}
                        >
                          <PowerOff aria-hidden /> تعطيل
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActivateTarget(branch)}
                        >
                          <Power aria-hidden /> تفعيل
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(branch)}
                      >
                        <Trash2 aria-hidden /> حذف
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <EditBranchDialog
        branch={editTarget}
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
      />
      <ActivateBranchDialog
        branch={activateTarget}
        open={!!activateTarget}
        onOpenChange={(o) => !o && setActivateTarget(null)}
      />
      <DeactivateBranchDialog
        branch={deactivateTarget}
        open={!!deactivateTarget}
        onOpenChange={(o) => !o && setDeactivateTarget(null)}
      />
      <DeleteBranchDialog
        branch={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        onDeleted={() => onOpenChange(false)}
      />
    </>
  );
}
