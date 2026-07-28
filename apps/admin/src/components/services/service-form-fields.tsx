"use client";

import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UNIT_LABELS } from "@/constants/services";
import type { ServiceFormValues } from "@/lib/validations/service";
import type { CategoryWithCount } from "@/types/service-category";
import type { ServiceUnit } from "@/types/service";

interface ServiceFormFieldsProps {
  register: UseFormRegister<ServiceFormValues>;
  control: Control<ServiceFormValues>;
  errors: FieldErrors<ServiceFormValues>;
  categories: readonly CategoryWithCount[];
  /** خانة "نشطة عند الإنشاء" - للإنشاء فقط، التعديل لا يملك هذا الحقل بالخادم */
  showActiveToggle?: boolean;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

const UNITS = Object.keys(UNIT_LABELS) as ServiceUnit[];

/** حقول نموذج الخدمة - مشتركة بين حواري الإنشاء والتعديل */
export function ServiceFormFields({
  register,
  control,
  errors,
  categories,
  showActiveToggle = false,
}: ServiceFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="service-name">الاسم *</Label>
        <Input id="service-name" aria-invalid={!!errors.name} {...register("name")} />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="service-description">الوصف</Label>
        <Textarea
          id="service-description"
          rows={2}
          aria-invalid={!!errors.description}
          {...register("description")}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="service-category">التصنيف *</Label>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => field.onChange(v ?? "")}
                items={Object.fromEntries(
                  categories.map((cat) => [cat.id, cat.isActive ? cat.name : `${cat.name} (معطل)`]),
                )}
              >
                <SelectTrigger id="service-category" className="w-full" aria-invalid={!!errors.categoryId}>
                  <SelectValue placeholder="اختر تصنيفاً" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                      {!cat.isActive && " (معطل)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.categoryId?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="service-unit">نوع التسعير *</Label>
          <Controller
            control={control}
            name="unit"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => field.onChange(v ?? "PIECE")}
                items={UNIT_LABELS}
              >
                <SelectTrigger id="service-unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="service-price">السعر *</Label>
          <Input
            id="service-price"
            type="number"
            step="0.01"
            min="0"
            dir="ltr"
            aria-invalid={!!errors.price}
            {...register("price")}
          />
          <FieldError message={errors.price?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="service-hours">مدة التنفيذ (ساعة)</Label>
          <Input
            id="service-hours"
            type="number"
            min="1"
            dir="ltr"
            placeholder="اختياري"
            aria-invalid={!!errors.estimatedHours}
            {...register("estimatedHours")}
          />
          <FieldError message={errors.estimatedHours?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="service-sort">ترتيب العرض</Label>
          <Input
            id="service-sort"
            type="number"
            min="0"
            dir="ltr"
            aria-invalid={!!errors.sortOrder}
            {...register("sortOrder")}
          />
          <FieldError message={errors.sortOrder?.message} />
        </div>
      </div>

      {showActiveToggle && (
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id="service-active"
                checked={field.value}
                onCheckedChange={(c) => field.onChange(c === true)}
              />
              <Label htmlFor="service-active" className="cursor-pointer font-normal">
                نشطة عند الإنشاء
              </Label>
            </div>
          )}
        />
      )}
    </div>
  );
}
