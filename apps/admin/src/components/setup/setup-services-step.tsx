"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Plus, Tag } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useCreateServiceMutation } from "@/hooks/use-services";
import { useAllCategoriesQuery, useCreateCategoryMutation } from "@/hooks/use-service-categories";
import { getErrorMessage } from "@/lib/axios";
import { formatCurrency } from "@/lib/format";
import {
  categoryFormSchema,
  toCategoryInput,
  type CategoryFormValues,
} from "@/lib/validations/service-category";
import {
  serviceFormSchema,
  toCreateServiceInput,
  type ServiceFormValues,
} from "@/lib/validations/service";
import { SetupError } from "./setup-error";

export interface CreatedService {
  id: string;
  name: string;
  price: number;
  unit: ServiceFormValues["unit"];
}

interface SetupServicesStepProps {
  services: readonly CreatedService[];
  onServiceCreated: (service: CreatedService) => void;
  onBack: () => void;
  onNext: () => void;
}

const UNIT_LABELS: Record<ServiceFormValues["unit"], string> = {
  PIECE: "بالقطعة",
  KG: "بالكيلو",
  FIXED: "سعر ثابت",
};

/**
 * الخطوة الثانية — التصنيفات والخدمات.
 *
 * التصنيف مطلوب قبل الخدمة: `Service.categoryId` غير اختياري في المخطّط
 * (`onDelete: Restrict`)، فمحاولة إنشاء خدمة بلا تصنيف ترفضها قاعدة البيانات.
 * لذلك يُعرض إنشاء التصنيف أولاً، ويُعطَّل نموذج الخدمة حتى يوجد واحد — منعُ
 * الحالة المستحيلة قبل وقوعها أوضح من رسالة خطأ بعدها.
 *
 * كل الإنشاء يمرّ على الطفرات القائمة بلا أي مسار جديد.
 */
export function SetupServicesStep({
  services,
  onServiceCreated,
  onBack,
  onNext,
}: SetupServicesStepProps) {
  const categoriesQuery = useAllCategoriesQuery();
  const createCategory = useCreateCategoryMutation();
  const createService = useCreateServiceMutation();

  const categories = categoriesQuery.data?.categories ?? [];
  const hasCategory = categories.length > 0;

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", sortOrder: "0" },
  });

  const serviceForm = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      unit: "PIECE",
      price: "",
      estimatedHours: "",
      sortOrder: "0",
      isActive: true,
    },
  });

  async function submitCategory(values: CategoryFormValues) {
    const created = await createCategory.mutateAsync(toCategoryInput(values));
    categoryForm.reset({ name: "", sortOrder: "0" });
    // اختيار التصنيف الجديد تلقائياً — هو المقصود في أغلب الحالات
    serviceForm.setValue("categoryId", created.id, { shouldValidate: true });
  }

  async function submitService(values: ServiceFormValues) {
    const created = await createService.mutateAsync(toCreateServiceInput(values));
    onServiceCreated({
      id: created.id,
      name: created.name,
      price: Number(created.price),
      unit: values.unit,
    });
    serviceForm.reset({ ...serviceForm.getValues(), name: "", price: "", description: "" });
    serviceForm.setFocus("name");
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        الخدمة تتبع تصنيفاً (مثل «غسيل» أو «كي»). أنشئ تصنيفاً واحداً على الأقل ثم أضِف خدماتك.
      </p>

      {/* ــــ التصنيف ــــ */}
      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          <Tag className="size-4" aria-hidden /> التصنيفات
        </h3>

        {categoriesQuery.isPending ? (
          <div className="h-9 animate-pulse rounded-md bg-muted" />
        ) : hasCategory ? (
          <ul className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <li
                key={c.id}
                className="rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground"
              >
                {c.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">لا توجد تصنيفات بعد.</p>
        )}

        <form
          onSubmit={categoryForm.handleSubmit(submitCategory)}
          noValidate
          className="flex items-start gap-2"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="setup-category-name" className="sr-only">
              اسم التصنيف
            </Label>
            <Input
              id="setup-category-name"
              placeholder="اسم التصنيف — مثل: غسيل"
              aria-invalid={!!categoryForm.formState.errors.name}
              {...categoryForm.register("name")}
            />
            {categoryForm.formState.errors.name && (
              <p role="alert" className="text-xs text-destructive">
                {categoryForm.formState.errors.name.message}
              </p>
            )}
          </div>
          <Button type="submit" variant="outline" disabled={createCategory.isPending}>
            {createCategory.isPending ? <Spinner /> : <Plus aria-hidden />}
            إضافة
          </Button>
        </form>

        {createCategory.isError && (
          <SetupError
            title="تعذّر إنشاء التصنيف"
            description={getErrorMessage(createCategory.error)}
          />
        )}
      </section>

      {/* ــــ الخدمة ــــ */}
      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-medium">الخدمات</h3>

        {!hasCategory && (
          <p className="text-xs text-muted-foreground">أضِف تصنيفاً أولاً لتتمكّن من إضافة خدمة.</p>
        )}

        <form
          onSubmit={serviceForm.handleSubmit(submitService)}
          noValidate
          className="grid gap-3 sm:grid-cols-2"
        >
          <fieldset disabled={!hasCategory} className="contents">
            <div className="space-y-1.5">
              <Label htmlFor="setup-service-name">اسم الخدمة *</Label>
              <Input
                id="setup-service-name"
                placeholder="غسيل قميص"
                aria-invalid={!!serviceForm.formState.errors.name}
                {...serviceForm.register("name")}
              />
              {serviceForm.formState.errors.name && (
                <p role="alert" className="text-xs text-destructive">
                  {serviceForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="setup-service-category">التصنيف *</Label>
              <Select
                value={serviceForm.watch("categoryId")}
                onValueChange={(v) =>
                  serviceForm.setValue("categoryId", v ?? "", { shouldValidate: true })
                }
                items={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
              >
                <SelectTrigger id="setup-service-category" className="w-full">
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {serviceForm.formState.errors.categoryId && (
                <p role="alert" className="text-xs text-destructive">
                  {serviceForm.formState.errors.categoryId.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="setup-service-unit">طريقة التسعير *</Label>
              <Select
                value={serviceForm.watch("unit")}
                onValueChange={(v) =>
                  serviceForm.setValue("unit", (v as ServiceFormValues["unit"]) ?? "PIECE")
                }
                items={UNIT_LABELS}
              >
                <SelectTrigger id="setup-service-unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(UNIT_LABELS) as ServiceFormValues["unit"][]).map((u) => (
                    <SelectItem key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="setup-service-price">السعر *</Label>
              <Input
                id="setup-service-price"
                type="number"
                min="0"
                step="0.01"
                dir="ltr"
                placeholder="0"
                aria-invalid={!!serviceForm.formState.errors.price}
                {...serviceForm.register("price")}
              />
              {serviceForm.formState.errors.price && (
                <p role="alert" className="text-xs text-destructive">
                  {serviceForm.formState.errors.price.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" variant="outline" disabled={createService.isPending}>
                {createService.isPending ? <Spinner /> : <Plus aria-hidden />}
                إضافة الخدمة
              </Button>
            </div>
          </fieldset>
        </form>

        {createService.isError && (
          <SetupError
            title="تعذّر إنشاء الخدمة"
            description={getErrorMessage(createService.error)}
          />
        )}

        {services.length > 0 && (
          <ul className="divide-y rounded-md border">
            {services.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="min-w-0 truncate">{s.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatCurrency(s.price)} · {UNIT_LABELS[s.unit]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowRight aria-hidden /> رجوع
        </Button>
        <Button type="button" size="lg" onClick={onNext} disabled={services.length === 0}>
          المتابعة
          <ArrowLeft aria-hidden />
        </Button>
      </div>
      {services.length === 0 && (
        <p className="text-end text-xs text-muted-foreground">
          أضِف خدمة واحدة على الأقل للمتابعة.
        </p>
      )}
    </div>
  );
}
