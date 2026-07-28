import { create } from "zustand";
import type { Customer } from "@/types/customer";
import type { Service } from "@/types/service";

/** بند بمسودة الطلب - يحمل نسخة (snapshot) من الخدمة وقت الإضافة */
export interface OrderDraftItem {
  /** معرف محلي فريد للسطر - يسمح بنفس الخدمة أكثر من مرة بخصومات مختلفة */
  lineId: string;
  service: Service;
  /** PIECE: عدد صحيح | KG: وزن عشري | FIXED: ثابتة عند 1 (لا تُعرض بالواجهة) */
  quantity: number;
  discount: number;
  /** = price × quantity (قبل الخصم) */
  grossAmount: number;
  /** = grossAmount − discount */
  lineTotal: number;
}

interface OrderDraftState {
  customer: Customer | null;
  items: OrderDraftItem[];
  setCustomer: (customer: Customer | null) => void;
  addItem: (service: Service) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  updateDiscount: (lineId: string, discount: number) => void;
  /** إعادة ضبط كاملة - تُستدعى عند إغلاق المعالج */
  reset: () => void;
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

function computeLine(
  price: number,
  quantity: number,
  discount: number,
): Pick<OrderDraftItem, "grossAmount" | "lineTotal"> {
  const grossAmount = round2(price * quantity);
  // Business Rule: الخصم لا يتجاوز إجمالي السطر - يُضبط تلقائياً لو صار غير صالح
  const clampedDiscount = Math.min(discount, grossAmount);
  return { grossAmount, lineTotal: round2(grossAmount - clampedDiscount) };
}

let lineIdCounter = 0;
function nextLineId(): string {
  lineIdCounter += 1;
  return `line-${lineIdCounter}-${Date.now()}`;
}

/**
 * Order Draft Store - Zustand، بالذاكرة فقط (بلا persist/localStorage)
 * يخزّن العميل والبنود المختارة لتُستخدم لاحقاً بخطوتي المراجعة والإرسال
 */
export const useOrderDraftStore = create<OrderDraftState>()((set) => ({
  customer: null,
  items: [],

  setCustomer: (customer) => set({ customer }),

  addItem: (service) => {
    const price = Number(service.price);
    const quantity = 1; // نقطة بداية موحدة - PIECE/KG قابلة للتعديل، FIXED ثابتة
    const { grossAmount, lineTotal } = computeLine(price, quantity, 0);
    set((state) => ({
      items: [
        ...state.items,
        { lineId: nextLineId(), service, quantity, discount: 0, grossAmount, lineTotal },
      ],
    }));
  },

  removeItem: (lineId) =>
    set((state) => ({ items: state.items.filter((i) => i.lineId !== lineId) })),

  updateQuantity: (lineId, quantity) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.lineId !== lineId) return item;
        const price = Number(item.service.price);
        const { grossAmount, lineTotal } = computeLine(price, quantity, item.discount);
        return {
          ...item,
          quantity,
          grossAmount,
          lineTotal,
          discount: Math.min(item.discount, grossAmount),
        };
      }),
    })),

  updateDiscount: (lineId, discount) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.lineId !== lineId) return item;
        const price = Number(item.service.price);
        const { grossAmount, lineTotal } = computeLine(price, item.quantity, discount);
        return { ...item, discount: Math.min(discount, grossAmount), grossAmount, lineTotal };
      }),
    })),

  reset: () => set({ customer: null, items: [] }),
}));

/** مجاميع حية مشتقة من البنود - Subtotal / Discount Total / Grand Total */
export function selectOrderDraftTotals(items: readonly OrderDraftItem[]): {
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
} {
  const subtotal = round2(items.reduce((sum, i) => sum + i.grossAmount, 0));
  const discountTotal = round2(items.reduce((sum, i) => sum + i.discount, 0));
  return { subtotal, discountTotal, grandTotal: round2(subtotal - discountTotal) };
}
