"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCreateBranchMutation } from "@/hooks/use-branches";
import { getErrorMessage } from "@/lib/axios";
import {
  branchFormSchema,
  toCreateBranchInput,
  type BranchFormValues,
} from "@/lib/validations/branch";
import { SetupError } from "./setup-error";

interface SetupBranchStepProps {
  onCreated: (branch: { id: string; name: string }) => void;
}

/**
 * الخطوة الأولى — الفرع.
 *
 * تعيد استخدام branchFormSchema وtoCreateBranchInput وuseCreateBranchMutation
 * كما هي: تحقّقٌ مطابق للخادم ومسارٌ واحد لإنشاء الفرع. أي نسخة ثانية من هذا
 * المنطق كانت ستنحرف عن الأصل بأوّل تعديل في قواعد الخادم.
 */
export function SetupBranchStep({ onCreated }: SetupBranchStepProps) {
  const mutation = useCreateBranchMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: { name: "", address: "", phone: "" },
  });

  async function onSubmit(values: BranchFormValues) {
    const branch = await mutation.mutateAsync(toCreateBranchInput(values));
    onCreated({ id: branch.id, name: branch.name });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground">
          الفرع هو المكان الذي تُسجَّل عليه الطلبات. بدونه لا يمكن إنشاء أي طلب.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="setup-branch-name">اسم الفرع *</Label>
        <Input
          id="setup-branch-name"
          autoFocus
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "setup-branch-name-error" : undefined}
          placeholder="الفرع الرئيسي"
          {...register("name")}
        />
        {errors.name && (
          <p id="setup-branch-name-error" role="alert" className="text-xs text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="setup-branch-phone">رقم الهاتف (اختياري)</Label>
        <Input
          id="setup-branch-phone"
          dir="ltr"
          inputMode="tel"
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? "setup-branch-phone-error" : undefined}
          placeholder="01000000000"
          {...register("phone")}
        />
        {errors.phone && (
          <p id="setup-branch-phone-error" role="alert" className="text-xs text-destructive">
            {errors.phone.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="setup-branch-address">العنوان (اختياري)</Label>
        <Textarea
          id="setup-branch-address"
          rows={2}
          aria-invalid={!!errors.address}
          {...register("address")}
        />
        {errors.address && (
          <p role="alert" className="text-xs text-destructive">
            {errors.address.message}
          </p>
        )}
      </div>

      {mutation.isError && (
        <SetupError title="تعذّر إنشاء الفرع" description={getErrorMessage(mutation.error)} />
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending ? <Spinner className="text-primary-foreground" /> : null}
          حفظ الفرع والمتابعة
          <ArrowLeft aria-hidden />
        </Button>
      </div>
    </form>
  );
}
