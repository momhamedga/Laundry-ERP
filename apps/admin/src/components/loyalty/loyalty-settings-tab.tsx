"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useExpirePointsMutation, useLoyaltySettingsQuery, useUpdateLoyaltySettingsMutation } from "@/hooks/use-loyalty";
import { usePermissions } from "@/hooks/use-permissions";
import type { LoyaltyEarnMode } from "@/types/loyalty";

export function LoyaltySettingsTab() {
  const { can } = usePermissions();
  const canManage = can("loyalty:manage");
  const { data, isLoading } = useLoyaltySettingsQuery();
  const mutation = useUpdateLoyaltySettingsMutation();
  const expireMutation = useExpirePointsMutation();

  const [form, setForm] = useState<Record<string, string>>({});
  const [prevId, setPrevId] = useState<string | null>(null);
  if (data && data.id !== prevId) {
    setPrevId(data.id);
    setForm({
      earnMode: data.earnMode,
      pointsPerCurrency: data.pointsPerCurrency,
      minOrderForPoints: data.minOrderForPoints,
      maxPointsPerOrder: data.maxPointsPerOrder != null ? String(data.maxPointsPerOrder) : "",
      redeemValue: data.redeemValue,
      minPointsToRedeem: String(data.minPointsToRedeem),
      pointExpiryDays: data.pointExpiryDays != null ? String(data.pointExpiryDays) : "",
      welcomeBonus: String(data.welcomeBonus),
      birthdayBonus: String(data.birthdayBonus),
      referralBonus: String(data.referralBonus),
    });
  }

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function save() {
    const num = (v: string) => (v === "" ? null : Number(v));
    mutation.mutate({
      earnMode: form.earnMode,
      pointsPerCurrency: Number(form.pointsPerCurrency),
      minOrderForPoints: Number(form.minOrderForPoints),
      maxPointsPerOrder: num(form.maxPointsPerOrder ?? ""),
      redeemValue: Number(form.redeemValue),
      minPointsToRedeem: Number(form.minPointsToRedeem),
      pointExpiryDays: num(form.pointExpiryDays ?? ""),
      welcomeBonus: Number(form.welcomeBonus),
      birthdayBonus: Number(form.birthdayBonus),
      referralBonus: Number(form.referralBonus),
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>إعدادات الولاء</CardTitle>
            <CardDescription>قواعد احتساب النقاط والاستبدال والمكافآت</CardDescription>
          </div>
          {canManage && (
            <Button variant="outline" size="sm" disabled={expireMutation.isPending} onClick={() => expireMutation.mutate()}>
              {expireMutation.isPending && <Spinner className="size-3.5" />}
              تشغيل انتهاء النقاط
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>طريقة الكسب</Label>
            <Select value={form.earnMode} onValueChange={(v) => v && set("earnMode", v as LoyaltyEarnMode)} disabled={!canManage}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE">نسبة من الإجمالي</SelectItem>
                <SelectItem value="FIXED_PER_ORDER">ثابت لكل طلب</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="نقاط لكل وحدة عملة" k="pointsPerCurrency" form={form} set={set} disabled={!canManage} />
          <Field label="الحد الأدنى للطلب" k="minOrderForPoints" form={form} set={set} disabled={!canManage} />
          <Field label="أقصى نقاط لكل طلب" k="maxPointsPerOrder" form={form} set={set} disabled={!canManage} placeholder="بلا حد" />
          <Field label="قيمة النقطة (عملة)" k="redeemValue" form={form} set={set} disabled={!canManage} />
          <Field label="أدنى نقاط للاستبدال" k="minPointsToRedeem" form={form} set={set} disabled={!canManage} />
          <Field label="انتهاء النقاط (أيام)" k="pointExpiryDays" form={form} set={set} disabled={!canManage} placeholder="لا تنتهي" />
          <Field label="مكافأة الترحيب" k="welcomeBonus" form={form} set={set} disabled={!canManage} />
          <Field label="مكافأة الميلاد" k="birthdayBonus" form={form} set={set} disabled={!canManage} />
          <Field label="مكافأة الإحالة" k="referralBonus" form={form} set={set} disabled={!canManage} />
        </div>
        {canManage && (
          <div className="flex justify-end">
            <Button disabled={mutation.isPending} onClick={save}>
              {mutation.isPending && <Spinner className="text-primary-foreground" />}
              حفظ
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, k, form, set, disabled, placeholder }: { label: string; k: string; form: Record<string, string>; set: (k: string, v: string) => void; disabled: boolean; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type="number" step="any" placeholder={placeholder} value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} disabled={disabled} />
    </div>
  );
}
