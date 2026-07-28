"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BranchFormValues } from "@/lib/validations/branch";

interface BranchFormFieldsProps {
  register: UseFormRegister<BranchFormValues>;
  errors: FieldErrors<BranchFormValues>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

/** حقول نموذج الفرع - مشتركة بين حواري الإنشاء والتعديل */
export function BranchFormFields({ register, errors }: BranchFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="branch-name">اسم الفرع *</Label>
        <Input id="branch-name" aria-invalid={!!errors.name} {...register("name")} />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="branch-address">العنوان</Label>
        <Input id="branch-address" aria-invalid={!!errors.address} {...register("address")} />
        <FieldError message={errors.address?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="branch-phone">الهاتف</Label>
        <Input
          id="branch-phone"
          dir="ltr"
          placeholder="+201001234567"
          aria-invalid={!!errors.phone}
          {...register("phone")}
        />
        <FieldError message={errors.phone?.message} />
      </div>
    </div>
  );
}
