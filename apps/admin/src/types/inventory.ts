import type { PaginationMeta } from "@/types";

/** أنواع المخزون/الموردين/المشتريات (Phase 7) - مطابقة لـ apps/api/src/modules/* */

export type InventoryItemType = "PRODUCT" | "RAW_MATERIAL";
export type InventoryUnit = "PIECE" | "KG" | "GRAM" | "LITER" | "METER" | "BOX" | "PACK";
export type MovementType =
  | "IN"
  | "OUT"
  | "RETURN"
  | "ADJUSTMENT"
  | "LOSS"
  | "TRANSFER"
  | "OPENING"
  | "CLOSING";
export type GenericMovementType = "IN" | "OUT" | "RETURN" | "LOSS" | "OPENING" | "CLOSING";
export type PurchaseStatus = "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";
export type AlertType = "LOW_STOCK" | "OUT_OF_STOCK";
export type AlertStatus = "OPEN" | "RESOLVED";

// ==================== Items ====================

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  type: InventoryItemType;
  unit: InventoryUnit;
  category: string | null;
  description: string | null;
  quantity: string;
  reorderLevel: string;
  costPrice: string;
  sellPrice: string;
  isActive: boolean;
  supplierId: string | null;
  createdAt: string;
  updatedAt: string;
  // ---- Barcode & QR (Phase 8) - إضافية اختيارية من الخادم ----
  barcode?: string | null;
  barcodeType?: "CODE128" | "CODE39" | "EAN13" | "EAN8" | "UPC" | "QR" | null;
  qrCode?: string | null;
  printCount?: number;
  lastPrintedAt?: string | null;
  labelTemplateId?: string | null;
}

export interface InventoryItemsResult {
  items: InventoryItem[];
  meta: PaginationMeta;
}

export interface ListItemsParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: InventoryItemType;
  supplierId?: string;
  isActive?: boolean;
  lowStock?: boolean;
  sortBy?: "createdAt" | "name" | "sku" | "quantity";
  sortOrder?: "asc" | "desc";
}

export interface CreateItemInput {
  sku: string;
  name: string;
  type: InventoryItemType;
  unit: InventoryUnit;
  category?: string | null;
  description?: string | null;
  quantity?: number;
  reorderLevel?: number;
  costPrice?: number;
  sellPrice?: number;
  supplierId?: string | null;
}

export type UpdateItemInput = Partial<Omit<CreateItemInput, "sku" | "quantity">>;

export interface CreateMovementInput {
  type: GenericMovementType;
  quantity: number;
  unitCost?: number;
  reference?: string | null;
  note?: string | null;
}

export interface AdjustInput {
  newQuantity: number;
  reason: string;
}

export interface TransferInput {
  fromItemId: string;
  toItemId: string;
  quantity: number;
  note?: string | null;
}

export interface StockCountInput {
  note?: string | null;
  lines: { itemId: string; countedQuantity: number }[];
}

export interface InventoryStats {
  totalItems: number;
  activeItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
  openAlerts: number;
}

// ==================== Movements ====================

export interface MovementRow {
  id: string;
  type: MovementType;
  quantity: string;
  beforeQuantity: string;
  afterQuantity: string;
  unitCost: string | null;
  reference: string | null;
  note: string | null;
  createdAt: string;
  item: { id: string; name: string; sku: string; unit: string };
}

export interface MovementsResult {
  movements: MovementRow[];
  meta: PaginationMeta;
}

export interface ListMovementsParams {
  page?: number;
  limit?: number;
  itemId?: string;
  type?: MovementType;
  from?: string;
  to?: string;
  sortBy?: "createdAt" | "quantity";
  sortOrder?: "asc" | "desc";
}

// ==================== Alerts ====================

export interface AlertRow {
  id: string;
  type: AlertType;
  status: AlertStatus;
  quantity: string;
  threshold: string;
  createdAt: string;
  resolvedAt: string | null;
  item: { id: string; name: string; sku: string };
}

export interface AlertsResult {
  alerts: AlertRow[];
  meta: PaginationMeta;
}

// ==================== Suppliers ====================

export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxNumber: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SuppliersResult {
  suppliers: Supplier[];
  meta: PaginationMeta;
}

export interface ListSuppliersParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: "createdAt" | "name";
  sortOrder?: "asc" | "desc";
}

export interface CreateSupplierInput {
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  notes?: string | null;
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

export interface SupplierStats {
  totalPurchases: number;
  receivedPurchases: number;
  totalSpent: number;
  itemsSupplied: number;
  lastPurchaseAt: string | null;
}

// ==================== Purchases ====================

export interface PurchaseListRow {
  id: string;
  purchaseNumber: string;
  status: PurchaseStatus;
  subtotal: string;
  taxRate: string;
  tax: string;
  total: string;
  createdAt: string;
  supplier: { id: string; name: string };
  _count: { items: number };
}

export interface PurchaseItemRow {
  id: string;
  quantity: string;
  unitCost: string;
  total: string;
  item: { id: string; name: string; sku: string; unit: string };
}

export interface PurchaseDetail {
  id: string;
  purchaseNumber: string;
  status: PurchaseStatus;
  subtotal: string;
  taxRate: string;
  tax: string;
  total: string;
  notes: string | null;
  receivedAt: string | null;
  createdAt: string;
  supplier: { id: string; name: string };
  items: PurchaseItemRow[];
}

export interface PurchasesResult {
  purchases: PurchaseListRow[];
  meta: PaginationMeta;
}

export interface ListPurchasesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: PurchaseStatus;
  supplierId?: string;
  from?: string;
  to?: string;
  sortBy?: "createdAt" | "total";
  sortOrder?: "asc" | "desc";
}

export interface CreatePurchaseInput {
  supplierId: string;
  taxRate: number;
  notes?: string | null;
  items: { itemId: string; quantity: number; unitCost: number }[];
}
