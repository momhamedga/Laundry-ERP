import { z } from "zod";
import type { OrderDraftItem } from "@/store/order-draft-store";
import type { CreateOrderInput, UpdateOrderInput } from "@/types/orders";
import type { PaymentMethod } from "@/types/payment";

const PAYMENT_METHODS: readonly PaymentMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET"];

/**
 * تحقق مطابق لقواعد apps/api/src/modules/orders/orders.validator.ts (createOrderSchema)
 * الخادم يرفض dueDate <= receivedAt (وليس فقط dueDate < receivedAt) - نفس القاعدة هنا.
 * discount/paymentAmount يعتمدان على subtotal الحي من Order Draft Store وقت المراجعة
 * (لا خصم أو دفعة تتجاوز الإجمالي الفرعي/الكلي بعد الخصم)
 */
export function buildOrderReviewFormSchema(subtotal: number) {
  return z
    .object({
      receivedAt: z.string().min(1, "تاريخ الاستلام مطلوب"),
      dueDate: z.string().min(1, "تاريخ التسليم مطلوب"),
      notes: z.string().trim().max(1000, "الملاحظات طويلة جداً"),
      discount: z
        .string()
        .refine(
          (v) => v.trim() === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0),
          "قيمة خصم غير صالحة",
        )
        .refine((v) => v.trim() === "" || Number(v) <= subtotal, "الخصم لا يتجاوز الإجمالي الفرعي"),
      paymentMethod: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]),
      paymentAmount: z
        .string()
        .refine(
          (v) => v.trim() === "" || (!Number.isNaN(Number(v)) && Number(v) > 0),
          "مبلغ غير صالح",
        ),
    })
    .refine((d) => new Date(d.dueDate).getTime() > new Date(d.receivedAt).getTime(), {
      message: "يجب أن يكون تاريخ التسليم بعد تاريخ الاستلام",
      path: ["dueDate"],
    })
    .refine(
      (d) => {
        if (d.paymentAmount.trim() === "") return true;
        const discount = d.discount.trim() === "" ? 0 : Number(d.discount);
        return Number(d.paymentAmount) <= subtotal - discount;
      },
      { message: "مبلغ الدفعة لا يتجاوز الإجمالي الكلي بعد الخصم", path: ["paymentAmount"] },
    );
}

export type OrderReviewFormValues = z.infer<ReturnType<typeof buildOrderReviewFormSchema>>;

/** يبني Payload الإنشاء بالكامل من Order Draft Store - لا إعادة حساب أسعار هنا */
/**
 * تحقق تعديل الطلب مطابق لـ updateOrderSchema بالخادم - يعتمد على receivedAt
 * الثابت (غير قابل للتعديل) وsubtotal الحالي (لمنع خصم يجعل الإجمالي سالباً)
 */
export function buildEditOrderFormSchema(receivedAt: string, subtotal: number) {
  return z
    .object({
      dueDate: z.string().min(1, "تاريخ التسليم مطلوب"),
      discount: z
        .string()
        .refine(
          (v) => v.trim() === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0),
          "قيمة خصم غير صالحة",
        )
        .refine((v) => v.trim() === "" || Number(v) <= subtotal, "الخصم لا يتجاوز الإجمالي الفرعي"),
      notes: z.string().trim().max(1000, "الملاحظات طويلة جداً"),
    })
    .refine((d) => new Date(d.dueDate).getTime() > new Date(receivedAt).getTime(), {
      message: "يجب أن يكون تاريخ التسليم بعد تاريخ الاستلام",
      path: ["dueDate"],
    });
}

export type EditOrderFormValues = z.infer<ReturnType<typeof buildEditOrderFormSchema>>;

export function toUpdateOrderInput(values: EditOrderFormValues): UpdateOrderInput {
  const notes = values.notes.trim();
  return {
    dueDate: new Date(values.dueDate).toISOString(),
    discount: values.discount.trim() === "" ? 0 : Number(values.discount),
    notes: notes === "" ? null : notes,
  };
}

export function toCreateOrderInput(
  values: OrderReviewFormValues,
  customerId: string,
  items: readonly OrderDraftItem[],
  branchId?: string,
): CreateOrderInput {
  const notes = values.notes.trim();
  return {
    customerId,
    ...(branchId ? { branchId } : {}),
    receivedAt: new Date(values.receivedAt).toISOString(),
    dueDate: new Date(values.dueDate).toISOString(),
    discount: values.discount.trim() === "" ? 0 : Number(values.discount),
    notes: notes === "" ? null : notes,
    items: items.map((item) => ({
      serviceId: item.service.id,
      quantity: item.quantity,
      discount: item.discount,
    })),
  };
}
