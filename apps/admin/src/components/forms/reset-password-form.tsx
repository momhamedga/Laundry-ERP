"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, KeyRound } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { PasswordRequirements } from "@/components/profile/password-requirements";
import { PasswordStrength } from "@/components/profile/password-strength";
import { PasswordVisibilityToggle } from "@/components/profile/password-visibility-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { SuccessState } from "@/components/ui/success-state";
import { useResetPasswordMutation } from "@/hooks/use-password-reset";
import { ERROR_CODES, getErrorCode, getErrorMessage } from "@/lib/axios";
import {
  resetPasswordFormSchema,
  toResetPasswordInput,
  type ResetPasswordFormValues,
} from "@/lib/validations/reset-password";
import { ResetPasswordErrorState } from "./reset-password-error-state";


interface ResetPasswordFormProps {
  token: string;
}

/** نموذج تعيين كلمة سر جديدة - POST /auth/reset-password فقط */
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const mutation = useResetPasswordMutation();
  const [visibility, setVisibility] = useState({ next: false, confirm: false });
  const [serverError, setServerError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const requirementsId = useId();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  const newPassword = watch("newPassword");

  async function onSubmit(values: ResetPasswordFormValues) {
    setServerError(null);
    try {
      await mutation.mutateAsync(toResetPasswordInput(token, values));
      setSucceeded(true);
    } catch (error) {
      if (getErrorCode(error) === ERROR_CODES.INVALID_RESET_TOKEN) {
        setTokenInvalid(true);
      } else {
        setServerError(getErrorMessage(error));
      }
    }
  }

  if (tokenInvalid) {
    return (
      <ResetPasswordErrorState
        description="انتهت صلاحية رابط إعادة التعيين أو أنه غير صالح. اطلب رابطاً جديداً."
        action={
          <Link href="/forgot-password" className={buttonVariants({ variant: "outline", size: "sm" })}>
            طلب رابط جديد
          </Link>
        }
      />
    );
  }

  if (succeeded) {
    return (
      <SuccessState
        icon={KeyRound}
        title="تم تغيير كلمة المرور بنجاح"
        description="يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة."
        action={
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
            تسجيل الدخول
          </Link>
        }
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {serverError}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="reset-new-password">كلمة السر الجديدة *</Label>
        <div className="relative">
          <Input
            id="reset-new-password"
            type={visibility.next ? "text" : "password"}
            dir="ltr"
            autoComplete="new-password"
            className="pe-10"
            aria-invalid={!!errors.newPassword}
            aria-describedby={requirementsId}
            {...register("newPassword")}
          />
          <PasswordVisibilityToggle
            visible={visibility.next}
            onToggle={() => setVisibility((v) => ({ ...v, next: !v.next }))}
            label="كلمة السر الجديدة"
          />
        </div>
        {errors.newPassword && (
          <p role="alert" className="text-xs text-destructive">
            {errors.newPassword.message}
          </p>
        )}
        <PasswordStrength password={newPassword} />
        <PasswordRequirements id={requirementsId} password={newPassword} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reset-confirm-password">تأكيد كلمة السر *</Label>
        <div className="relative">
          <Input
            id="reset-confirm-password"
            type={visibility.confirm ? "text" : "password"}
            dir="ltr"
            autoComplete="new-password"
            className="pe-10"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          <PasswordVisibilityToggle
            visible={visibility.confirm}
            onToggle={() => setVisibility((v) => ({ ...v, confirm: !v.confirm }))}
            label="تأكيد كلمة السر"
          />
        </div>
        {errors.confirmPassword && (
          <p role="alert" className="text-xs text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
        {(isSubmitting || mutation.isPending) && <Spinner className="text-primary-foreground" />}
        تعيين كلمة السر الجديدة
      </Button>
    </form>
  );
}
