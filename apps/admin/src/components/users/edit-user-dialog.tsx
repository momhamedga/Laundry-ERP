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
import { useAssignUserRoleMutation, useUpdateUserMutation } from "@/hooks/use-users";
import {
  editUserFormSchema,
  toUpdateUserInput,
  type EditUserFormValues,
} from "@/lib/validations/user";
import type { User } from "@/types/user";
import { UserCommonFields } from "./user-common-fields";

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toFormValues(user: User | null): EditUserFormValues {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    branchId: user?.branchId ?? "",
    role: user?.role ?? "CASHIER",
  };
}

/**
 * حوار تعديل مستخدم - يستدعي PATCH /users/:id للحقول الأساسية، وإضافياً
 * PATCH /users/:id/role فقط إذا تغيّر الدور فعلياً (Endpoint منفصل بالخادم
 * بحماية إضافية ضد تخفيض آخر Admin نشط - لا يُدمج مع التحديث العام)
 */
export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const updateMutation = useUpdateUserMutation(user?.id ?? "");
  const assignRoleMutation = useAssignUserRoleMutation(user?.id ?? "");
  const isPending = updateMutation.isPending || assignRoleMutation.isPending;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: toFormValues(user),
  });

  // مزامنة النموذج مع المستخدم المُحمَّل بدون useEffect ("تعديل الحالة أثناء الرسم")
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (user && open && loadedFor !== user.id) {
    setLoadedFor(user.id);
    setValue("name", user.name);
    setValue("email", user.email);
    setValue("phone", user.phone ?? "");
    setValue("branchId", user.branchId ?? "");
    setValue("role", user.role);
  }

  async function onSubmit(values: EditUserFormValues) {
    if (!user) return;
    try {
      await updateMutation.mutateAsync(toUpdateUserInput(values));
      if (values.role !== user.role) {
        await assignRoleMutation.mutateAsync(values.role);
      }
      onOpenChange(false);
    } catch {
      // toast بالفعل عبر onError الخاص بكل mutation
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
          <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
          <DialogDescription>{user?.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <UserCommonFields
            register={register}
            errors={errors}
            role={watch("role")}
            onRoleChange={(role) => setValue("role", role, { shouldValidate: true })}
            branchId={watch("branchId")}
            onBranchChange={(branchId) => setValue("branchId", branchId)}
            idPrefix="edit-user"
          />

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner className="text-primary-foreground" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
