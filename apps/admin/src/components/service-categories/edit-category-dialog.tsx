"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useUpdateCategoryMutation } from "@/hooks/use-service-categories";
import {
  categoryFormSchema,
  toCategoryInput,
  type CategoryFormValues,
} from "@/lib/validations/service-category";
import type { CategoryWithCount } from "@/types/service-category";
import { CategoryFormFields } from "./category-form-fields";

interface EditCategoryDialogProps {
  category: CategoryWithCount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toFormValues(category: CategoryWithCount | null): CategoryFormValues {
  return { name: category?.name ?? "", sortOrder: String(category?.sortOrder ?? 0) };
}

/** حوار تعديل تصنيف - Controlled بالكامل (يُستدعى من الجدول) */
export function EditCategoryDialog({ category, open, onOpenChange }: EditCategoryDialogProps) {
  const mutation = useUpdateCategoryMutation(category?.id ?? "");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: toFormValues(category),
  });

  // مزامنة النموذج مع التصنيف المُحمَّل بدون useEffect ("تعديل الحالة أثناء الرسم")
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (category && open && loadedFor !== category.id) {
    setLoadedFor(category.id);
    reset(toFormValues(category));
  }

  async function onSubmit(values: CategoryFormValues) {
    try {
      await mutation.mutateAsync(toCategoryInput(values));
      onOpenChange(false);
    } catch {
      // toast بالفعل عبر onError
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setLoadedFor(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعديل التصنيف</DialogTitle>
          <DialogDescription>{category?.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <CategoryFormFields register={register} errors={errors} />
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="text-primary-foreground" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
