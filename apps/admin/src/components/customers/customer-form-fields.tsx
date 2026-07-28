"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerFormValues } from "@/lib/validations/customer";

interface CustomerFormFieldsProps {
  register: UseFormRegister<CustomerFormValues>;
  errors: FieldErrors<CustomerFormValues>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

/** حقول نموذج العميل - مشتركة بين حواري الإنشاء والتعديل */
export function CustomerFormFields({ register, errors }: CustomerFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="customer-name">الاسم *</Label>
        <Input id="customer-name" aria-invalid={!!errors.name} {...register("name")} />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="customer-phone">الهاتف *</Label>
        <Input
          id="customer-phone"
          dir="ltr"
          placeholder="+201001234567"
          aria-invalid={!!errors.phone}
          {...register("phone")}
        />
        <FieldError message={errors.phone?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="customer-email">البريد الإلكتروني</Label>
        <Input
          id="customer-email"
          type="email"
          dir="ltr"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="customer-address">العنوان</Label>
        <Input id="customer-address" aria-invalid={!!errors.address} {...register("address")} />
        <FieldError message={errors.address?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="customer-notes">ملاحظات</Label>
        <Textarea
          id="customer-notes"
          rows={3}
          aria-invalid={!!errors.notes}
          {...register("notes")}
        />
        <FieldError message={errors.notes?.message} />
      </div>
    </div>
  );
}
