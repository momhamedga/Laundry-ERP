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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useCreateUserMutation } from "@/hooks/use-users";
import {
  createUserFormSchema,
  toCreateUserInput,
  type CreateUserFormValues,
} from "@/lib/validations/user";
import { UserCommonFields } from "./user-common-fields";

const EMPTY_VALUES: CreateUserFormValues = {
  name: "",
  email: "",
  password: "",
  role: "CASHIER",
  phone: "",
  branchId: "",
};

/** حوار إضافة مستخدم جديد - يتطلب users:manage (يُتحقق في UsersToolbar قبل العرض) */
export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const mutation = useCreateUserMutation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  async function onSubmit(values: CreateUserFormValues) {
    try {
      await mutation.mutateAsync(toCreateUserInput(values));
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
            <Plus aria-hidden /> مستخدم جديد
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة مستخدم جديد</DialogTitle>
          <DialogDescription>سيتمكن المستخدم من تسجيل الدخول فور الإنشاء.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <UserCommonFields
            register={register}
            errors={errors}
            role={watch("role")}
            onRoleChange={(role) => setValue("role", role, { shouldValidate: true })}
            branchId={watch("branchId")}
            onBranchChange={(branchId) => setValue("branchId", branchId)}
            idPrefix="create-user"
          />

          <div className="space-y-1.5">
            <Label htmlFor="create-user-password">كلمة السر *</Label>
            <Input
              id="create-user-password"
              type="password"
              dir="ltr"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p role="alert" className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              ٨ أحرف على الأقل، حرف كبير وصغير ورقم
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="text-primary-foreground" />}
              إنشاء المستخدم
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
