"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, KeyRound } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { SuccessState } from "@/components/ui/success-state";
import { useChangePasswordMutation } from "@/hooks/use-profile";
import { ERROR_CODES, getErrorCode, getErrorMessage } from "@/lib/axios";
import {
  changePasswordFormSchema,
  toChangePasswordInput,
  type ChangePasswordFormValues,
} from "@/lib/validations/change-password";
import { PasswordRequirements } from "./password-requirements";
import { PasswordStrength } from "./password-strength";
import { PasswordVisibilityToggle } from "./password-visibility-toggle";

const EMPTY_VALUES: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};


function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

/** نموذج تغيير كلمة السر - Current/New/Confirm فقط، لا Draft يُحفظ بأي تخزين */
export function ChangePasswordForm() {
  const mutation = useChangePasswordMutation();
  const [visibility, setVisibility] = useState({ current: false, next: false, confirm: false });
  const [serverError, setServerError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const requirementsId = useId();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const newPassword = watch("newPassword");

  async function onSubmit(values: ChangePasswordFormValues) {
    setServerError(null);
    try {
      await mutation.mutateAsync(toChangePasswordInput(values));
      reset(EMPTY_VALUES); // لا Draft يبقى بالذاكرة بعد النجاح
      setVisibility({ current: false, next: false, confirm: false });
      setSucceeded(true);
    } catch (error) {
      setServerError(getErrorMessage(error));
      if (getErrorCode(error) === ERROR_CODES.WRONG_CURRENT_PASSWORD) {
        setError("currentPassword", { message: "كلمة السر الحالية غير صحيحة" });
      }
      // toast الخطأ العام يظهر بالفعل عبر onError الخاص بالـ mutation
    }
  }

  if (succeeded) {
    return (
      <SuccessState
        icon={KeyRound}
        title="تم تغيير كلمة المرور بنجاح"
        description="ستحتاج لتسجيل الدخول مجدداً في المرة القادمة التي تنتهي فيها جلستك الحالية - لن نُخرجك الآن."
        action={
          <Button variant="outline" size="sm" onClick={() => setSucceeded(false)}>
            تغيير كلمة مرور أخرى
          </Button>
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
        <Label htmlFor="change-password-current">كلمة السر الحالية *</Label>
        <div className="relative">
          <Input
            id="change-password-current"
            type={visibility.current ? "text" : "password"}
            dir="ltr"
            autoComplete="current-password"
            className="pe-10"
            aria-invalid={!!errors.currentPassword}
            aria-describedby={errors.currentPassword ? "change-password-current-error" : undefined}
            {...register("currentPassword")}
          />
          <PasswordVisibilityToggle
            visible={visibility.current}
            onToggle={() => setVisibility((v) => ({ ...v, current: !v.current }))}
            label="كلمة السر الحالية"
          />
        </div>
        <FieldError id="change-password-current-error" message={errors.currentPassword?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="change-password-new">كلمة السر الجديدة *</Label>
        <div className="relative">
          <Input
            id="change-password-new"
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
        <FieldError id="change-password-new-error" message={errors.newPassword?.message} />
        <PasswordStrength password={newPassword} />
        <PasswordRequirements id={requirementsId} password={newPassword} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="change-password-confirm">تأكيد كلمة السر الجديدة *</Label>
        <div className="relative">
          <Input
            id="change-password-confirm"
            type={visibility.confirm ? "text" : "password"}
            dir="ltr"
            autoComplete="new-password"
            className="pe-10"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? "change-password-confirm-error" : undefined}
            {...register("confirmPassword")}
          />
          <PasswordVisibilityToggle
            visible={visibility.confirm}
            onToggle={() => setVisibility((v) => ({ ...v, confirm: !v.confirm }))}
            label="تأكيد كلمة السر الجديدة"
          />
        </div>
        <FieldError id="change-password-confirm-error" message={errors.confirmPassword?.message} />
      </div>

      <Button type="submit" disabled={isSubmitting || mutation.isPending}>
        {(isSubmitting || mutation.isPending) && <Spinner className="text-primary-foreground" />}
        تغيير كلمة المرور
      </Button>
    </form>
  );
}
