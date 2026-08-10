"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Plus, UserCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useCreateUserMutation } from "@/hooks/use-users";
import { getErrorMessage } from "@/lib/axios";
import {
  createUserFormSchema,
  toCreateUserInput,
  type CreateUserFormValues,
} from "@/lib/validations/user";
import { useAuthStore } from "@/store/auth-store";
import type { UserRole } from "@/types";
import { SetupError } from "./setup-error";

export interface CreatedUser {
  id: string;
  name: string;
  role: UserRole;
}

interface SetupUsersStepProps {
  branch: { id: string; name: string };
  users: readonly CreatedUser[];
  onUserCreated: (user: CreatedUser) => void;
  onBack: () => void;
  onNext: () => void;
}

/**
 * الأدوار المعروضة هي أدوار المشروع كما هي — لا اختراع لدور جديد.
 * ADMIN غائب عمداً: حساب المدير الذي يشغّل المعالج قائمٌ أصلاً (وإلا ما استطاع
 * الوصول إلى هنا)، وهذه الخطوة لطاقم التشغيل اليومي.
 */
const STAFF_ROLES: Record<Exclude<UserRole, "ADMIN">, string> = {
  MANAGER: "مدير فرع",
  CASHIER: "كاشير",
  WORKER: "عامل مغسلة",
  DELIVERY: "مندوب توصيل",
};

/**
 * الخطوة الثالثة — المستخدمون.
 *
 * اختيارية بالكامل: النظام يعمل بحساب المدير وحده، وإجبار إنشاء موظّفين قبل
 * الاستخدام يؤخّر أوّل طلب بلا سبب. والفرع المُنشأ في الخطوة الأولى يُسنَد
 * تلقائياً — فحسابٌ بلا فرع يفشل عند إنشاء الطلب، وهو العطل الذي وُجد هذا
 * المعالج أصلاً لمنعه.
 */
export function SetupUsersStep({
  branch,
  users,
  onUserCreated,
  onBack,
  onNext,
}: SetupUsersStepProps) {
  const mutation = useCreateUserMutation();
  const currentUser = useAuthStore((s) => s.user);

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "CASHIER",
      phone: "",
      branchId: branch.id,
    },
  });

  async function onSubmit(values: CreateUserFormValues) {
    const created = await mutation.mutateAsync(toCreateUserInput(values));
    onUserCreated({ id: created.id, name: created.name, role: created.role });
    // كلمة السرّ لا تبقى في الذاكرة بعد الإرسال، ولا تُعرَض ولا تُسجَّل
    form.reset({
      name: "",
      email: "",
      password: "",
      role: values.role,
      phone: "",
      branchId: branch.id,
    });
    form.setFocus("name");
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        هذه الخطوة اختيارية — يمكنك البدء بحسابك وحدك وإضافة الموظّفين لاحقاً. الحسابات التي
        تُنشئها هنا تُسنَد إلى فرع «{branch.name}».
      </p>

      {currentUser && (
        <p className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
          <UserCheck className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            حسابك <strong>{currentUser.name}</strong> مدير النظام، وسيبقى كما هو.
          </span>
        </p>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="setup-user-name">الاسم *</Label>
          <Input
            id="setup-user-name"
            aria-invalid={!!form.formState.errors.name}
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p role="alert" className="text-xs text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="setup-user-email">البريد الإلكتروني *</Label>
          <Input
            id="setup-user-email"
            type="email"
            dir="ltr"
            autoComplete="off"
            aria-invalid={!!form.formState.errors.email}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p role="alert" className="text-xs text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="setup-user-password">كلمة السر *</Label>
          <Input
            id="setup-user-password"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            aria-invalid={!!form.formState.errors.password}
            aria-describedby="setup-user-password-hint"
            {...form.register("password")}
          />
          <p id="setup-user-password-hint" className="text-xs text-muted-foreground">
            ٨ أحرف على الأقل، مع حرف كبير وحرف صغير ورقم.
          </p>
          {form.formState.errors.password && (
            <p role="alert" className="text-xs text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="setup-user-role">الدور *</Label>
          <Select
            value={form.watch("role")}
            onValueChange={(v) => form.setValue("role", (v as UserRole) ?? "CASHIER")}
            items={STAFF_ROLES}
          >
            <SelectTrigger id="setup-user-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STAFF_ROLES) as (keyof typeof STAFF_ROLES)[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {STAFF_ROLES[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Button type="submit" variant="outline" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner /> : <Plus aria-hidden />}
            إضافة المستخدم
          </Button>
        </div>
      </form>

      {mutation.isError && (
        <SetupError title="تعذّر إنشاء المستخدم" description={getErrorMessage(mutation.error)} />
      )}

      {users.length > 0 && (
        <ul className="divide-y rounded-md border">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="min-w-0 truncate">{u.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {u.role === "ADMIN" ? "مدير النظام" : STAFF_ROLES[u.role]}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowRight aria-hidden /> رجوع
        </Button>
        <Button type="button" size="lg" onClick={onNext}>
          {users.length === 0 ? "تخطّي والمتابعة" : "المتابعة"}
          <ArrowLeft aria-hidden />
        </Button>
      </div>
    </div>
  );
}
