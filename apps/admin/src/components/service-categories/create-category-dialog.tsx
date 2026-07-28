"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useCreateCategoryMutation } from "@/hooks/use-service-categories";
import {
  categoryFormSchema,
  toCategoryInput,
  type CategoryFormValues,
} from "@/lib/validations/service-category";
import { CategoryFormFields } from "./category-form-fields";

const EMPTY_VALUES: CategoryFormValues = { name: "", sortOrder: "0" };

export function CreateCategoryDialog() {
  const [open, setOpen] = useState(false);
  const mutation = useCreateCategoryMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  async function onSubmit(values: CategoryFormValues) {
    try {
      await mutation.mutateAsync(toCategoryInput(values));
      reset(EMPTY_VALUES);
      setOpen(false);
    } catch {
      // رسالة الخطأ ظهرت بالفعل عبر toast في onError الخاص بالـ mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus aria-hidden /> تصنيف جديد
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة تصنيف جديد</DialogTitle>
          <DialogDescription>الاسم إلزامي، وترتيب العرض اختياري (افتراضي 0)</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <CategoryFormFields register={register} errors={errors} />
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="text-primary-foreground" />}
              حفظ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
