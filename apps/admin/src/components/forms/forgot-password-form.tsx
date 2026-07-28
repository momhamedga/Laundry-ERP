"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { SuccessState } from "@/components/ui/success-state";
import { useForgotPasswordMutation } from "@/hooks/use-password-reset";
import { getErrorMessage } from "@/lib/axios";
import {
  forgotPasswordFormSchema,
  toForgotPasswordInput,
  type ForgotPasswordFormValues,
} from "@/lib/validations/reset-password";
import { ForgotPasswordErrorState } from "./forgot-password-error-state";

/** نموذج نسيت كلمة المرور - POST /auth/forgot-password فقط */
export function ForgotPasswordForm() {
  const mutation = useForgotPasswordMutation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setServerError(null);
    try {
      const message = await mutation.mutateAsync(toForgotPasswordInput(values));
      setSuccessMessage(message);
    } catch (error) {
      // فشل بنيوي (لا اتصال / 500) يستبدل النموذج بالكامل - غيره (429/تحقق) يبقى Inline
      const isInfraFailure =
        error instanceof AxiosError && (!error.response || error.response.status >= 500);
      if (isInfraFailure) {
        setPageError(getErrorMessage(error));
      } else {
        setServerError(getErrorMessage(error));
      }
    }
  }

  if (pageError) {
    return <ForgotPasswordErrorState description={pageError} onRetry={() => setPageError(null)} />;
  }

  if (successMessage) {
    return (
      <div className="space-y-4">
        <SuccessState title={successMessage} description="تحقق من صندوق الوارد (وربما الرسائل غير المرغوبة) خلال دقائق قليلة." />
        <div className="text-center">
          <Link href="/login" className="text-sm text-primary hover:underline">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
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
        <Label htmlFor="forgot-password-email">البريد الإلكتروني</Label>
        <Input
          id="forgot-password-email"
          type="email"
          dir="ltr"
          autoComplete="email"
          placeholder="admin@laundry.local"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "forgot-password-email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="forgot-password-email-error" role="alert" className="text-xs text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
        {(isSubmitting || mutation.isPending) && <Spinner className="text-primary-foreground" />}
        إرسال رابط إعادة التعيين
      </Button>

      <div className="text-center">
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          العودة لتسجيل الدخول
        </Link>
      </div>
    </form>
  );
}
