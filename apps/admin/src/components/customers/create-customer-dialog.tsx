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
import { useCreateCustomerMutation } from "@/hooks/use-customers";
import {
  customerFormSchema,
  toCustomerInput,
  type CustomerFormValues,
} from "@/lib/validations/customer";
import type { Customer } from "@/types/customer";
import { CustomerFormFields } from "./customer-form-fields";

const EMPTY_VALUES: CustomerFormValues = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

interface CreateCustomerDialogProps {
  /** وضع Controlled بالكامل - عند تمرير الاثنين لا يُعرض زر الإطلاق الداخلي */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** يُستدعى بعد نجاح الإنشاء مع العميل الجديد - مفيد لتحديده تلقائياً بمكان آخر */
  onCreated?: (customer: Customer) => void;
}

/**
 * حوار إضافة عميل - يملك زر إطلاق افتراضي (الاستخدام الحالي بصفحة العملاء)،
 * أو Controlled بالكامل من الخارج (يُستخدم داخل معالج إنشاء الطلب)
 */
export function CreateCustomerDialog({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onCreated,
}: CreateCustomerDialogProps = {}) {
  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const mutation = useCreateCustomerMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  async function onSubmit(values: CustomerFormValues) {
    try {
      const customer = await mutation.mutateAsync(toCustomerInput(values));
      reset(EMPTY_VALUES);
      setOpen(false);
      onCreated?.(customer);
    } catch {
      // رسالة الخطأ ظهرت بالفعل عبر toast في onError الخاص بالـ mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger
          render={
            <Button>
              <Plus aria-hidden /> عميل جديد
            </Button>
          }
        />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة عميل جديد</DialogTitle>
          <DialogDescription>أدخل بيانات العميل. الاسم والهاتف إلزاميان.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <CustomerFormFields register={register} errors={errors} />
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
