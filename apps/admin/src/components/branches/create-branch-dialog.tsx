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
import { useCreateBranchMutation } from "@/hooks/use-branches";
import {
  branchFormSchema,
  toCreateBranchInput,
  type BranchFormValues,
} from "@/lib/validations/branch";
import { BranchFormFields } from "./branch-form-fields";

const EMPTY_VALUES: BranchFormValues = {
  name: "",
  address: "",
  phone: "",
};

/** حوار إضافة فرع - يملك زر إطلاق افتراضي (يُعرض فقط عند وجود صلاحية branches:manage) */
export function CreateBranchDialog() {
  const [open, setOpen] = useState(false);
  const mutation = useCreateBranchMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  async function onSubmit(values: BranchFormValues) {
    try {
      await mutation.mutateAsync(toCreateBranchInput(values));
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
            <Plus aria-hidden /> فرع جديد
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة فرع جديد</DialogTitle>
          <DialogDescription>أدخل بيانات الفرع. الاسم إلزامي.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <BranchFormFields register={register} errors={errors} />
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
