import { create } from "zustand";
import type { BarcodeType } from "@/types/barcode";

/** عنصر واحد في طابور الطباعة (حالة عميل فقط - لا يُخزَّن بالخادم) */
export interface PrintQueueItem {
  itemId: string;
  name: string;
  sku: string;
  barcode: string | null;
  barcodeType: BarcodeType | null;
  qrCode: string | null;
  price: number;
  category: string | null;
  quantity: number;
}

interface PrintQueueState {
  items: PrintQueueItem[];
  add: (item: Omit<PrintQueueItem, "quantity"> & { quantity?: number }) => void;
  remove: (itemId: string) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  clear: () => void;
}

/**
 * طابور طباعة الملصقات - حالة عميل مشتركة بين تبويبات صفحة الباركود (Zustand،
 * نفس مكتبة auth-store، بلا مكتبة جديدة). الطباعة الفعلية عبر window.print بالواجهة
 * وتُسجَّل بالخادم عبر POST /barcodes/print.
 */
export const usePrintQueueStore = create<PrintQueueState>((set) => ({
  items: [],
  add: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.itemId === item.itemId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.itemId === item.itemId ? { ...i, quantity: i.quantity + (item.quantity ?? 1) } : i,
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: item.quantity ?? 1 }] };
    }),
  remove: (itemId) => set((state) => ({ items: state.items.filter((i) => i.itemId !== itemId) })),
  setQuantity: (itemId, quantity) =>
    set((state) => ({
      items: state.items.map((i) => (i.itemId === itemId ? { ...i, quantity: Math.max(1, quantity) } : i)),
    })),
  clear: () => set({ items: [] }),
}));
