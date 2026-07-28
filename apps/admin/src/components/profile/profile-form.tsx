"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useUpdateProfileMutation } from "@/hooks/use-profile";
import {
  profileFormSchema,
  toUpdateProfileInput,
  type ProfileFormValues,
} from "@/lib/validations/profile";
import type { User } from "@/types/user";
import { ProfileCard } from "./profile-card";

interface ProfileFormProps {
  user: User;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

function toFormValues(user: User): ProfileFormValues {
  return { name: user.name, phone: user.phone ?? "" };
}

/** تعديل الاسم والهاتف فقط - البريد/الدور/الفرع/الحالة غير قابلة للتعديل هنا (تُعرض بـ ProfileInformation فقط) */
export function ProfileForm({ user }: ProfileFormProps) {
  const mutation = useUpdateProfileMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toFormValues(user),
  });

  async function onSubmit(values: ProfileFormValues) {
    try {
      const updated = await mutation.mutateAsync(toUpdateProfileInput(values));
      reset({ name: updated.name, phone: updated.phone ?? "" });
    } catch {
      // toast بالفعل عبر onError الخاص بالـ mutation
    }
  }

  return (
    <ProfileCard icon={Pencil} title="تعديل البيانات">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">الاسم *</Label>
          <Input id="profile-name" aria-invalid={!!errors.name} {...register("name")} />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-phone">رقم الهاتف</Label>
          <Input
            id="profile-phone"
            dir="ltr"
            placeholder="+201001234567"
            aria-invalid={!!errors.phone}
            {...register("phone")}
          />
          <FieldError message={errors.phone?.message} />
        </div>

        <Button type="submit" disabled={mutation.isPending || !isDirty}>
          {mutation.isPending && <Spinner className="text-primary-foreground" />}
          حفظ التعديلات
        </Button>
      </form>
    </ProfileCard>
  );
}
