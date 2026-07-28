"use client";

import type { FieldErrors, FieldValues, Path, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveBranchesQuery } from "@/hooks/use-branches";
import type { UserRole } from "@/types";
import { ROLE_LABELS } from "./role-badge";

/** الحقول المشتركة بين نموذجي الإنشاء والتعديل - name/email/phone/role/branchId */
interface CommonUserFields {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  branchId: string;
}

interface UserCommonFieldsProps<T extends FieldValues & CommonUserFields> {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  branchId: string;
  onBranchChange: (branchId: string) => void;
  idPrefix: string;
}

const ROLES: readonly UserRole[] = ["ADMIN", "MANAGER", "CASHIER", "WORKER", "DELIVERY"];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

/** الحقول المشتركة بين حواري إنشاء/تعديل المستخدم - name/email/phone/role/branch */
export function UserCommonFields<T extends FieldValues & CommonUserFields>({
  register,
  errors,
  role,
  onRoleChange,
  branchId,
  onBranchChange,
  idPrefix,
}: UserCommonFieldsProps<T>) {
  const { data: branches } = useActiveBranchesQuery();

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>الاسم الكامل *</Label>
        <Input
          id={`${idPrefix}-name`}
          aria-invalid={!!errors.name}
          {...register("name" as Path<T>)}
        />
        <FieldError message={errors.name?.message as string | undefined} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-email`}>البريد الإلكتروني *</Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          dir="ltr"
          aria-invalid={!!errors.email}
          {...register("email" as Path<T>)}
        />
        <FieldError message={errors.email?.message as string | undefined} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-phone`}>الهاتف</Label>
        <Input
          id={`${idPrefix}-phone`}
          dir="ltr"
          placeholder="+201001234567"
          aria-invalid={!!errors.phone}
          {...register("phone" as Path<T>)}
        />
        <FieldError message={errors.phone?.message as string | undefined} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-role`}>الدور *</Label>
        <Select
          value={role}
          onValueChange={(v) => onRoleChange((v as UserRole) ?? role)}
          items={ROLE_LABELS}
        >
          <SelectTrigger id={`${idPrefix}-role`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-branch`}>الفرع</Label>
        <Select
          value={branchId || "none"}
          onValueChange={(v) => onBranchChange(v && v !== "none" ? v : "")}
          items={{
            none: "بلا فرع",
            ...Object.fromEntries((branches ?? []).map((b) => [b.id, b.name])),
          }}
        >
          <SelectTrigger id={`${idPrefix}-branch`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">بلا فرع</SelectItem>
            {branches?.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
