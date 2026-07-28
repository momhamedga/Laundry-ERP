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
import { useUpdateServiceMutation } from "@/hooks/use-services";
import {
  serviceFormSchema,
  toServiceInput,
  type ServiceFormValues,
} from "@/lib/validations/service";
import type { CategoryWithCount } from "@/types/service-category";
import type { Service } from "@/types/service";
import { ServiceFormFields } from "./service-form-fields";

interface EditServiceDialogProps {
  service: Service | null;
  categories: readonly CategoryWithCount[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toFormValues(service: Service | null): ServiceFormValues {
  return {
    name: service?.name ?? "",
    description: service?.description ?? "",
    categoryId: service?.categoryId ?? "",
    unit: service?.unit ?? "PIECE",
    price: service ? String(Number(service.price)) : "0",
    estimatedHours: service?.estimatedHours ? String(service.estimatedHours) : "",
    sortOrder: String(service?.sortOrder ?? 0),
    isActive: service?.isActive ?? true,
  };
}

/** حوار تعديل خدمة - بلا خانة isActive (غير موجودة في PATCH بالخادم) */
export function EditServiceDialog({
  service,
  categories,
  open,
  onOpenChange,
}: EditServiceDialogProps) {
  const mutation = useUpdateServiceMutation(service?.id ?? "");
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: toFormValues(service),
  });

  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (service && open && loadedFor !== service.id) {
    setLoadedFor(service.id);
    reset(toFormValues(service));
  }

  async function onSubmit(values: ServiceFormValues) {
    try {
      await mutation.mutateAsync(toServiceInput(values));
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل الخدمة</DialogTitle>
          <DialogDescription>{service?.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <ServiceFormFields
            register={register}
            control={control}
            errors={errors}
            categories={categories}
          />
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
