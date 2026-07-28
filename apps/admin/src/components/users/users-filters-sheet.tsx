"use client";

import { Filter } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { UsersFilters } from "@/hooks/use-users-filters";
import type { UserRole } from "@/types";
import { ROLE_LABELS } from "./role-badge";

interface UsersFiltersSheetProps {
  filters: UsersFilters;
  onApply: (patch: Partial<UsersFilters>) => void;
  activeCount: number;
}

type RoleValue = UserRole | "all";
type StatusValue = "all" | "active" | "inactive";

const ROLES: readonly UserRole[] = ["ADMIN", "MANAGER", "CASHIER", "WORKER", "DELIVERY"];

function statusToValue(isActive: boolean | undefined): StatusValue {
  if (isActive === true) return "active";
  if (isActive === false) return "inactive";
  return "all";
}

/** فلاتر: الدور والحالة - المطلوبان صراحةً بمواصفة هذه المرحلة فقط */
export function UsersFiltersSheet({ filters, onApply, activeCount }: UsersFiltersSheetProps) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<RoleValue>(filters.role ?? "all");
  const [status, setStatus] = useState<StatusValue>(statusToValue(filters.isActive));

  function handleOpenChange(next: boolean) {
    if (next) {
      setRole(filters.role ?? "all");
      setStatus(statusToValue(filters.isActive));
    }
    setOpen(next);
  }

  function handleApply() {
    onApply({
      role: role === "all" ? undefined : role,
      isActive: status === "all" ? undefined : status === "active",
    });
    setOpen(false);
  }

  function handleReset() {
    setRole("all");
    setStatus("all");
    onApply({ role: undefined, isActive: undefined });
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button variant="outline" className="relative">
            <Filter aria-hidden /> فلاتر
            {activeCount > 0 && (
              <span className="absolute -top-1.5 -end-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        }
      />
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>فلاتر المستخدمين</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 overflow-y-auto px-4">
          <div className="space-y-1.5">
            <Label>الدور</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole((v as RoleValue) ?? "all")}
              items={{ all: "الكل", ...ROLE_LABELS }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>الحالة</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus((v as StatusValue) ?? "all")}
              items={{ all: "الكل", active: "نشط", inactive: "معطل" }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">معطل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter className="flex-row">
          <Button variant="outline" className="flex-1" onClick={handleReset}>
            مسح
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            تطبيق
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
