"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAdminResetPasswordMutation } from "@/hooks/use-users";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormValues,
} from "@/lib/validations/user";
import type { User } from "@/types/user";

interface ResetPasswordDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_VALUES: ResetPasswordFormValues = { newPassword: "", confirmPassword: "" };

/** حوار إعادة تعيين كلمة سر - يُبطل كل جلسات المستخدم بالخادم فور النجاح */
export function ResetPasswordDialog({ user, open, onOpenChange }: ResetPasswordDialogProps) {
  const mutation = useAdminResetPasswordMutation(user?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    try {
      await mutation.mutateAsync(values.newPassword);
      reset(EMPTY_VALUES);
      onOpenChange(false);
    } catch {
      // toast بالفعل عبر onError الخاص بالـ mutation
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset(EMPTY_VALUES);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إعادة تعيين كلمة السر</DialogTitle>
          <DialogDescription>
            سيتم إبطال كل جلسات &quot;{user?.name}&quot; الحالية - يجب تسجيل الدخول من جديد.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-password-new">كلمة السر الجديدة *</Label>
            <Input
              id="reset-password-new"
              type="password"
              dir="ltr"
              aria-invalid={!!errors.newPassword}
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p role="alert" className="text-xs text-destructive">
                {errors.newPassword.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              ٨ أحرف على الأقل، حرف كبير وصغير ورقم
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reset-password-confirm">تأكيد كلمة السر *</Label>
            <Input
              id="reset-password-confirm"
              type="password"
              dir="ltr"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p role="alert" className="text-xs text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="text-primary-foreground" />}
              إعادة التعيين
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
