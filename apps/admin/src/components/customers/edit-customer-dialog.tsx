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
import { useUpdateCustomerMutation } from "@/hooks/use-customers";
import {
  customerFormSchema,
  toCustomerInput,
  type CustomerFormValues,
} from "@/lib/validations/customer";
import type { Customer } from "@/types/customer";
import { CustomerFormFields } from "./customer-form-fields";

interface EditCustomerDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toFormValues(customer: Customer | null): CustomerFormValues {
  return {
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    address: customer?.address ?? "",
    notes: customer?.notes ?? "",
  };
}

/** حوار تعديل عميل - Controlled بالكامل (يُستدعى من الجدول وصفحة التفاصيل) */
export function EditCustomerDialog({ customer, open, onOpenChange }: EditCustomerDialogProps) {
  const mutation = useUpdateCustomerMutation(customer?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: toFormValues(customer),
  });

  // مزامنة النموذج مع العميل المُحمَّل بدون useEffect
  // ("تعديل الحالة أثناء الرسم" - النمط الموصى به رسمياً من React لمثل هذه الحالة)
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (customer && open && loadedFor !== customer.id) {
    setLoadedFor(customer.id);
    reset(toFormValues(customer));
  }

  async function onSubmit(values: CustomerFormValues) {
    try {
      await mutation.mutateAsync(toCustomerInput(values));
      onOpenChange(false);
    } catch {
      // toast بالفعل عبر onError الخاص بالـ mutation
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
          <DialogTitle>تعديل بيانات العميل</DialogTitle>
          <DialogDescription>{customer?.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <CustomerFormFields register={register} errors={errors} />
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
