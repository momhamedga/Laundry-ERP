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
import { useUpdateBranchMutation } from "@/hooks/use-branches";
import {
  branchFormSchema,
  toUpdateBranchInput,
  type BranchFormValues,
} from "@/lib/validations/branch";
import type { Branch } from "@/types/branch";
import { BranchFormFields } from "./branch-form-fields";

interface EditBranchDialogProps {
  branch: Branch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toFormValues(branch: Branch | null): BranchFormValues {
  return {
    name: branch?.name ?? "",
    address: branch?.address ?? "",
    phone: branch?.phone ?? "",
  };
}

export function EditBranchDialog({ branch, open, onOpenChange }: EditBranchDialogProps) {
  const mutation = useUpdateBranchMutation(branch?.id ?? "");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: toFormValues(branch),
  });

  // مزامنة النموذج مع الفرع المُحمَّل بدون useEffect ("تعديل الحالة أثناء الرسم")
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (branch && open && loadedFor !== branch.id) {
    setLoadedFor(branch.id);
    setValue("name", branch.name);
    setValue("address", branch.address ?? "");
    setValue("phone", branch.phone ?? "");
  }

  async function onSubmit(values: BranchFormValues) {
    if (!branch) return;
    try {
      await mutation.mutateAsync(toUpdateBranchInput(values));
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
          <DialogTitle>تعديل بيانات الفرع</DialogTitle>
          <DialogDescription>{branch?.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <BranchFormFields register={register} errors={errors} />
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
