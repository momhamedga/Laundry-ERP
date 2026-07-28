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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useOrderDetailQuery } from "@/hooks/use-orders";
import { useCreatePaymentMutation } from "@/hooks/use-payments";
import { formatCurrency } from "@/lib/format";
import {
  createPaymentFormSchema,
  toCreatePaymentInput,
  type CreatePaymentFormValues,
} from "@/lib/validations/payment";
import type { OrderDetail } from "@/types/orders";
import type { CreatePaymentStatus, PaymentMethod } from "@/types/payment";
import { OrderFilterField } from "./order-filter-field";
import { METHOD_LABELS } from "./payment-method-badge";

const METHODS: readonly PaymentMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET"];

const STATUS_OPTIONS: { value: CreatePaymentStatus; label: string }[] = [
  { value: "COMPLETED", label: "مكتملة (تم الاستلام فعلياً)" },
  { value: "PENDING", label: "قيد الانتظار (بانتظار تأكيد التحويل مثلاً)" },
];

function emptyValues(orderId: string): CreatePaymentFormValues {
  return { orderId, method: "CASH", status: "COMPLETED", amount: "", reference: "", notes: "" };
}

interface CreatePaymentDialogProps {
  /** وضع Controlled بالكامل - عند تمرير الاثنين لا يُعرض زر الإطلاق الداخلي */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** طلب مُحدَّد مسبقاً - يُخفي OrderFilterField ويقفل الطلب (استدعاء من تفاصيل الطلب) */
  order?: OrderDetail;
}

/**
 * حوار تسجيل دفعة جديدة - يتطلب payments:create (يُتحقق بالمستدعي قبل العرض)
 * وضعان: زر إطلاق افتراضي مع اختيار الطلب (PaymentsToolbar)، أو Controlled
 * كاملاً بطلب مُقفَل مسبقاً (OrderDetailsDrawer) - بنفس نمط CreateCustomerDialog
 */
export function CreatePaymentDialog({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  order: lockedOrder,
}: CreatePaymentDialogProps = {}) {
  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const [orderNumber, setOrderNumber] = useState<string | undefined>(lockedOrder?.orderNumber);
  const mutation = useCreatePaymentMutation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatePaymentFormValues>({
    resolver: zodResolver(createPaymentFormSchema),
    defaultValues: emptyValues(lockedOrder?.id ?? ""),
  });

  const orderId = watch("orderId");
  // يُحمَّل فقط عند اختيار طلب من الفلتر - الطلب المُقفَل مُمرَّر جاهزاً بلا استعلام إضافي
  const { data: fetchedOrder } = useOrderDetailQuery(!lockedOrder && orderId ? orderId : null);
  const order = lockedOrder ?? fetchedOrder;
  const remaining = order ? Number(order.total) - Number(order.paidAmount) : null;

  // مزامنة النموذج مع الطلب المُقفَل عند تغيّره أثناء بقاء الحوار في الشجرة
  // (تفاصيل طلب أخرى قد تُفتح دون إغلاق الحوار) - بلا useEffect
  const [loadedForOrderId, setLoadedForOrderId] = useState<string | undefined>(lockedOrder?.id);
  if (lockedOrder && open && loadedForOrderId !== lockedOrder.id) {
    setLoadedForOrderId(lockedOrder.id);
    reset(emptyValues(lockedOrder.id));
    setOrderNumber(lockedOrder.orderNumber);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset(emptyValues(lockedOrder?.id ?? ""));
      setOrderNumber(lockedOrder?.orderNumber);
    }
    setOpen(next);
  }

  async function onSubmit(values: CreatePaymentFormValues) {
    try {
      await mutation.mutateAsync(toCreatePaymentInput(values));
      handleOpenChange(false);
    } catch {
      // toast بالفعل عبر onError الخاص بالـ mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger
          render={
            <Button>
              <Plus aria-hidden /> دفعة جديدة
            </Button>
          }
        />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل دفعة جديدة</DialogTitle>
          <DialogDescription dir="ltr">
            {lockedOrder ? lockedOrder.orderNumber : "اختر الطلب ثم أدخل تفاصيل الدفعة."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {!lockedOrder && (
            <div className="space-y-1.5">
              <Label>الطلب *</Label>
              <OrderFilterField
                orderId={orderId || undefined}
                orderNumber={orderNumber}
                onSelect={(id, number) => {
                  setValue("orderId", id ?? "", { shouldValidate: true });
                  setOrderNumber(number);
                }}
              />
              {errors.orderId && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.orderId.message}
                </p>
              )}
            </div>
          )}
          {order && remaining !== null && (
            <p className="text-xs text-muted-foreground">
              الإجمالي: {formatCurrency(order.total)} · المدفوع: {formatCurrency(order.paidAmount)} ·
              المتبقي: {formatCurrency(remaining)}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="create-payment-method">طريقة الدفع *</Label>
            <Select
              value={watch("method")}
              onValueChange={(v) => setValue("method", (v as PaymentMethod) ?? "CASH")}
              items={METHOD_LABELS}
            >
              <SelectTrigger id="create-payment-method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-payment-status">حالة الدفعة *</Label>
            <Select
              value={watch("status")}
              onValueChange={(v) => setValue("status", (v as CreatePaymentStatus) ?? "COMPLETED")}
              items={Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s.label]))}
            >
              <SelectTrigger id="create-payment-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-payment-amount">المبلغ *</Label>
            <Input
              id="create-payment-amount"
              type="number"
              min="0"
              step="0.01"
              dir="ltr"
              aria-invalid={!!errors.amount}
              {...register("amount")}
            />
            {errors.amount && (
              <p role="alert" className="text-xs text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-payment-reference">المرجع</Label>
            <Input
              id="create-payment-reference"
              dir="ltr"
              aria-invalid={!!errors.reference}
              {...register("reference")}
            />
            {errors.reference && (
              <p role="alert" className="text-xs text-destructive">
                {errors.reference.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-payment-notes">ملاحظات</Label>
            <Textarea id="create-payment-notes" rows={3} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="text-primary-foreground" />}
              تسجيل الدفعة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
