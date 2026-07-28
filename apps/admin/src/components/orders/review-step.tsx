"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SheetFooter } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useActiveBranchesQuery } from "@/hooks/use-branches";
import { useCreateOrderMutation } from "@/hooks/use-orders";
import { useCreatePaymentMutation } from "@/hooks/use-payments";
import { usePermissions } from "@/hooks/use-permissions";
import { getErrorMessage } from "@/lib/axios";
import {
  buildOrderReviewFormSchema,
  toCreateOrderInput,
  type OrderReviewFormValues,
} from "@/lib/validations/order";
import { formatCurrency } from "@/lib/format";
import { METHOD_LABELS } from "@/components/payments/payment-method-badge";
import { selectOrderDraftTotals, useOrderDraftStore } from "@/store/order-draft-store";
import type { OrderDetail } from "@/types/orders";
import type { PaymentMethod } from "@/types/payment";
import { CustomerCard } from "./customer-card";
import { ServiceSelectionStep } from "./service-selection-step";

interface ReviewStepProps {
  onBack: () => void;
  onCancel: () => void;
  onSuccess: (order: OrderDetail, paidAmount?: number) => void;
}

const PAYMENT_METHODS: readonly PaymentMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET"];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * خطوة المراجعة والإرسال - تعرض بيانات Order Draft Store، وتضيف خصماً
 * اختيارياً على مستوى الطلب كله + تسجيل دفعة اختيارية فور الإنشاء (نداءان
 * متتاليان: إنشاء الطلب ثم POST /payments بنفس useCreatePaymentMutation
 * الموجود - فشل الدفعة لا يُلغي الطلب المُنشأ بالفعل، فقط يُظهر خطأً)
 */
export function ReviewStep({ onBack, onCancel, onSuccess }: ReviewStepProps) {
  const { can } = usePermissions();
  const customer = useOrderDraftStore((s) => s.customer);
  const items = useOrderDraftStore((s) => s.items);
  // Business Rule بالخادم: خصم الطلب لا يتجاوز إجمالي البنود بعد خصوماتها الفردية
  // (orders.utils.ts computeTotals: subtotal = Σ(item gross - item discount)) -
  // هذا هو grandTotal بمخزن المسودة، وليس الـ subtotal الإجمالي قبل خصم البنود
  const { grandTotal: netItemsTotal } = selectOrderDraftTotals(items);
  const mutation = useCreateOrderMutation();
  const paymentMutation = useCreatePaymentMutation();
  // الخادم يشتق الفرع من المستخدم الحالي؛ عند غيابه (كحساب Admin بلا فرع مُعيَّن)
  // ولوجود فرع نشط واحد لا لبس فيه، نرسله صراحة بدل حقل اختيار جديد بالواجهة
  const { data: branches } = useActiveBranchesQuery();
  const fallbackBranchId = branches?.length === 1 ? branches[0].id : undefined;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrderReviewFormValues>({
    resolver: zodResolver(buildOrderReviewFormSchema(netItemsTotal)),
    defaultValues: {
      receivedAt: todayIsoDate(),
      dueDate: "",
      notes: "",
      discount: "0",
      paymentMethod: "CASH",
      paymentAmount: "",
    },
  });

  const discount = watch("discount");
  const grandTotalAfterDiscount =
    netItemsTotal - (discount.trim() === "" ? 0 : Number(discount) || 0);

  async function onSubmit(values: OrderReviewFormValues) {
    if (!customer) return;
    try {
      const order = await mutation.mutateAsync(
        toCreateOrderInput(values, customer.id, items, fallbackBranchId),
      );

      let paidAmount: number | undefined;
      if (values.paymentAmount.trim() !== "") {
        const amount = Number(values.paymentAmount);
        try {
          await paymentMutation.mutateAsync({
            orderId: order.id,
            amount,
            method: values.paymentMethod,
            status: "COMPLETED",
            reference: null,
            notes: null,
          });
          paidAmount = amount;
        } catch {
          // toast الخطأ ظهر بالفعل عبر onError الخاص بـ useCreatePaymentMutation؛
          // الطلب نفسه أُنشئ بنجاح - يمكن تسجيل الدفعة لاحقاً من تفاصيله
        }
      }

      onSuccess(order, paidAmount);
    } catch {
      // رسالة الفشل تُعرض عبر ErrorState أدناه (mutation.isError) - لا حاجة لإجراء إضافي
    }
  }

  if (!customer) return null;

  const isPending = mutation.isPending || paymentMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="contents">
      <div className="flex-1 space-y-4 overflow-y-auto px-4">
        <section className="space-y-2">
          <h3 className="text-sm font-medium">بيانات العميل</h3>
          <CustomerCard customerId={customer.id} />
        </section>

        {/* قابلة للتعديل الكامل (إضافة/حذف/تعديل خدمة) هنا مباشرة بلا حاجة للرجوع
            لخطوة 2 - ServiceSelectionStep مرتبطة بنفس Order Draft Store، تشمل
            البحث/الجدول القابل للتعديل/والملخص المالي معاً */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium">الخدمات</h3>
          <ServiceSelectionStep />
        </section>

        <section className="space-y-1.5">
          <Label htmlFor="review-discount">خصم إضافي على الطلب (اختياري)</Label>
          <Input
            id="review-discount"
            type="number"
            min="0"
            step="0.01"
            dir="ltr"
            aria-invalid={!!errors.discount}
            {...register("discount")}
          />
          {errors.discount && (
            <p role="alert" className="text-xs text-destructive">
              {errors.discount.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            الإجمالي الكلي بعد هذا الخصم: {formatCurrency(Math.max(grandTotalAfterDiscount, 0))}
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="review-received-at">تاريخ الاستلام *</Label>
            <Input
              id="review-received-at"
              type="date"
              dir="ltr"
              aria-invalid={!!errors.receivedAt}
              aria-describedby={errors.receivedAt ? "review-received-at-error" : undefined}
              {...register("receivedAt")}
            />
            {errors.receivedAt && (
              <p id="review-received-at-error" role="alert" className="text-xs text-destructive">
                {errors.receivedAt.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-due-date">تاريخ التسليم المتوقع *</Label>
            <Input
              id="review-due-date"
              type="date"
              dir="ltr"
              aria-invalid={!!errors.dueDate}
              aria-describedby={errors.dueDate ? "review-due-date-error" : undefined}
              {...register("dueDate")}
            />
            {errors.dueDate && (
              <p id="review-due-date-error" role="alert" className="text-xs text-destructive">
                {errors.dueDate.message}
              </p>
            )}
          </div>
        </section>

        <section className="space-y-1.5">
          <Label htmlFor="review-notes">ملاحظات (اختياري)</Label>
          <Textarea id="review-notes" rows={3} {...register("notes")} />
        </section>

        {can("payments:create") && (
          <section className="space-y-3 rounded-lg border p-3">
            <h3 className="text-sm font-medium">تسجيل دفعة عند الإنشاء (اختياري)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="review-payment-method">طريقة الدفع</Label>
                <Select
                  value={watch("paymentMethod")}
                  onValueChange={(v) => setValue("paymentMethod", (v as PaymentMethod) ?? "CASH")}
                  items={METHOD_LABELS}
                >
                  <SelectTrigger id="review-payment-method" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {METHOD_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="review-payment-amount">المبلغ (فارغ = بلا دفعة)</Label>
                <Input
                  id="review-payment-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  dir="ltr"
                  placeholder="0"
                  aria-invalid={!!errors.paymentAmount}
                  {...register("paymentAmount")}
                />
                {errors.paymentAmount && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.paymentAmount.message}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {mutation.isError && (
          <ErrorState
            title="تعذر إنشاء الطلب"
            description={getErrorMessage(mutation.error)}
            onRetry={handleSubmit(onSubmit)}
          />
        )}
      </div>

      <SheetFooter className="flex-row items-center justify-between border-t">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          إلغاء
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={isPending}>
            <ArrowRight aria-hidden /> رجوع
          </Button>
          {can("orders:create") && (
            <Button type="submit" disabled={isPending || items.length === 0}>
              {isPending && <Spinner className="text-primary-foreground" />}
              إنشاء الطلب
            </Button>
          )}
        </div>
      </SheetFooter>
    </form>
  );
}
