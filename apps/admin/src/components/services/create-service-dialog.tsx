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
import { useCreateServiceMutation } from "@/hooks/use-services";
import {
  serviceFormSchema,
  toCreateServiceInput,
  type ServiceFormValues,
} from "@/lib/validations/service";
import type { CategoryWithCount } from "@/types/service-category";
import { ServiceFormFields } from "./service-form-fields";

interface CreateServiceDialogProps {
  categories: readonly CategoryWithCount[];
}

const EMPTY_VALUES: ServiceFormValues = {
  name: "",
  description: "",
  categoryId: "",
  unit: "PIECE",
  price: "0",
  estimatedHours: "",
  sortOrder: "0",
  isActive: true,
};

export function CreateServiceDialog({ categories }: CreateServiceDialogProps) {
  const [open, setOpen] = useState(false);
  const mutation = useCreateServiceMutation();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  async function onSubmit(values: ServiceFormValues) {
    try {
      await mutation.mutateAsync(toCreateServiceInput(values));
      reset(EMPTY_VALUES);
      setOpen(false);
    } catch {
      // toast بالفعل عبر onError (مثل تكرار الاسم داخل نفس التصنيف - 409)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={categories.length === 0}>
            <Plus aria-hidden /> خدمة جديدة
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة خدمة جديدة</DialogTitle>
          <DialogDescription>الاسم والتصنيف والسعر إلزامية</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <ServiceFormFields
            register={register}
            control={control}
            errors={errors}
            categories={categories}
            showActiveToggle
          />
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
