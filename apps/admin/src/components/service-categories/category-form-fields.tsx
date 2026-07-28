"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryFormValues } from "@/lib/validations/service-category";

interface CategoryFormFieldsProps {
  register: UseFormRegister<CategoryFormValues>;
  errors: FieldErrors<CategoryFormValues>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

/** حقول نموذج التصنيف - مشتركة بين حواري الإنشاء والتعديل */
export function CategoryFormFields({ register, errors }: CategoryFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="category-name">الاسم *</Label>
        <Input id="category-name" aria-invalid={!!errors.name} {...register("name")} />
        <FieldError message={errors.name?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="category-sort">ترتيب العرض</Label>
        <Input
          id="category-sort"
          type="number"
          min="0"
          dir="ltr"
          aria-invalid={!!errors.sortOrder}
          {...register("sortOrder")}
        />
        <FieldError message={errors.sortOrder?.message} />
      </div>
    </div>
  );
}
