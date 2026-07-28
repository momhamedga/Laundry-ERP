import type {
  DigestMode,
  Notification,
  NotificationChannel,
  NotificationDelivery,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  UserRole,
} from "@prisma/client";

export type {
  DeliveryStatus,
  DigestMode,
  NotificationChannel,
  NotificationPriority,
  NotificationType,
} from "@prisma/client";

export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type NotificationRow = Notification;

// ==================== أحداث الإشعارات (عقد المُنتِجين) ====================
// قيم خام فقط هنا (أرقام/enums/معرّفات) - كل تنسيق (عملة/تسميات عربية للحالات
// والطرق) مسؤولية notification.templates.ts حصراً، لا Strings جاهزة من أي Module

export interface OrderCreatedData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  createdByName: string;
}

export interface OrderStatusChangedData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  oldStatus: OrderStatus | null;
  newStatus: OrderStatus;
  /** بريد من قام بالتغيير - AuthenticatedUser لا يحمل اسماً جاهزاً بلا استعلام إضافي (قيد أداء متعمّد) */
  changedByEmail: string;
}

export interface OrderCancelledData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  reason: string | null;
  cancelledByEmail: string;
}

export interface PaymentReceivedData {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  method: PaymentMethod;
  /** اسم حقيقي متاح مجاناً - Payment.receivedBy هو نفسه مُنشئ الدفعة دائماً */
  receivedByName: string;
}

export interface PaymentRefundedData {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  refundAmount: number;
  refundedByEmail: string;
}

export interface PaymentCancelledData {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  cancelledByEmail: string;
}

export interface InvoiceCreatedData {
  invoiceId: string;
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  total: number;
  createdByName: string;
}

export interface InvoiceSentData {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  sentTo: string;
}

export interface BackupCompletedData {
  triggeredByEmail: string;
}

export interface BackupFailedData {
  triggeredByEmail: string;
  errorMessage: string;
}

export interface SystemSettingsUpdatedData {
  updatedByEmail: string;
  changedSections: string[];
}

export interface UserCreatedData {
  userId: string;
  userName: string;
  userEmail: string;
  role: UserRole;
  createdByEmail: string;
}

export interface UserDisabledData {
  userId: string;
  userName: string;
}

// ==================== Phase 7: أحداث المخزون ====================

export interface LowStockData {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  reorderLevel: number;
}

export interface OutOfStockData {
  itemId: string;
  itemName: string;
  sku: string;
}

export interface PurchaseReceivedData {
  purchaseId: string;
  purchaseNumber: string;
  supplierName: string;
  total: number;
}

export interface PurchaseCancelledData {
  purchaseId: string;
  purchaseNumber: string;
  supplierName: string;
}

export interface StockAdjustedData {
  itemId: string;
  itemName: string;
  sku: string;
  previousQuantity: number;
  newQuantity: number;
  actorEmail: string;
}

// ==================== Phase 8: أحداث الباركود ====================

export interface BarcodeGeneratedData {
  itemId: string;
  itemName: string;
  sku: string;
  barcodeType: string;
}

export interface LabelPrintedData {
  itemCount: number;
  labelCount: number;
  actorEmail: string;
}

export interface LowStockScannedData {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
}

export interface InvalidScanData {
  code: string;
  actorEmail: string;
}

// ==================== Phase 9: أحداث الولاء/العضوية/الكوبونات ====================

export interface PointsEarnedData {
  customerId: string;
  customerName: string;
  points: number;
  balance: number;
}

export interface PointsRedeemedData {
  customerId: string;
  customerName: string;
  points: number;
  discountAmount: number;
}

export interface PointsExpiredData {
  customerId: string;
  customerName: string;
  points: number;
}

export interface MembershipChangedData {
  customerId: string;
  customerName: string;
  level: string;
}

export interface CouponCreatedData {
  code: string;
  couponType: string;
}

export interface CouponExpiredData {
  code: string;
}

export interface CouponUsedData {
  code: string;
  customerName: string;
  discountAmount: number;
}

// ==================== Phase 9.5: أحداث إغلاق اليوم المحاسبي ====================

export interface DayOpenedData {
  dayClosingId: string;
  businessDate: string;
  openingCash: number;
  openedByEmail: string;
}

export interface DayClosedData {
  dayClosingId: string;
  businessDate: string;
  totalRevenue: number;
  cashDifference: number;
  closedByEmail: string;
}

export interface DayReopenedData {
  dayClosingId: string;
  businessDate: string;
  reason: string;
  reopenedByEmail: string;
}

export interface NewDeviceLoginData {
  userAgent: string | null;
  ipAddress: string | null;
  loginAt: string;
}

export interface AccountLockedData {
  attempts: number;
  lockedUntil: string;
}

export interface PasswordResetData {
  resetAt: string;
}

/** Record<string, never> بدل {} فارغ - يتوافق مع NotificationEvent["data"] بلا أي حقل حقيقي */
export type TestNotificationData = Record<string, never>;

type BroadcastEventUnion =
  | { type: "ORDER_CREATED"; data: OrderCreatedData }
  | { type: "ORDER_STATUS_CHANGED"; data: OrderStatusChangedData }
  | { type: "ORDER_CANCELLED"; data: OrderCancelledData }
  | { type: "PAYMENT_RECEIVED"; data: PaymentReceivedData }
  | { type: "PAYMENT_REFUNDED"; data: PaymentRefundedData }
  | { type: "PAYMENT_CANCELLED"; data: PaymentCancelledData }
  | { type: "INVOICE_CREATED"; data: InvoiceCreatedData }
  | { type: "INVOICE_SENT"; data: InvoiceSentData }
  | { type: "BACKUP_COMPLETED"; data: BackupCompletedData }
  | { type: "BACKUP_FAILED"; data: BackupFailedData }
  | { type: "SYSTEM_SETTINGS_UPDATED"; data: SystemSettingsUpdatedData }
  | { type: "USER_CREATED"; data: UserCreatedData }
  | { type: "USER_DISABLED"; data: UserDisabledData }
  | { type: "LOW_STOCK"; data: LowStockData }
  | { type: "OUT_OF_STOCK"; data: OutOfStockData }
  | { type: "PURCHASE_RECEIVED"; data: PurchaseReceivedData }
  | { type: "PURCHASE_CANCELLED"; data: PurchaseCancelledData }
  | { type: "STOCK_ADJUSTED"; data: StockAdjustedData }
  | { type: "BARCODE_GENERATED"; data: BarcodeGeneratedData }
  | { type: "LABEL_PRINTED"; data: LabelPrintedData }
  | { type: "LOW_STOCK_SCANNED"; data: LowStockScannedData }
  | { type: "INVALID_SCAN"; data: InvalidScanData }
  | { type: "POINTS_EARNED"; data: PointsEarnedData }
  | { type: "POINTS_REDEEMED"; data: PointsRedeemedData }
  | { type: "POINTS_EXPIRED"; data: PointsExpiredData }
  | { type: "MEMBERSHIP_UPGRADED"; data: MembershipChangedData }
  | { type: "MEMBERSHIP_DOWNGRADED"; data: MembershipChangedData }
  | { type: "COUPON_CREATED"; data: CouponCreatedData }
  | { type: "COUPON_EXPIRED"; data: CouponExpiredData }
  | { type: "COUPON_USED"; data: CouponUsedData }
  | { type: "DAY_OPENED"; data: DayOpenedData }
  | { type: "DAY_CLOSED"; data: DayClosedData }
  | { type: "DAY_REOPENED"; data: DayReopenedData };

/**
 * حدث "عام" يُوزَّع على الأدوار المُعرَّفة بـ NOTIFICATION_RECIPIENT_ROLES.
 * extraUserIds (اختياري، متاح موحّداً على كل الأنواع عبر التقاطع أدناه):
 * توسيع دقيق بلا كسر البث حسب الدور - يُستخدم فقط لضم منشئ الطلب لتغيير
 * الحالة/الإلغاء ("Customer Owner" بمصطلح الـ Spec؛ Customer نفسه ليس User
 * فلا يمكنه استقبال إشعار، فالمقصود هو موظف الطلب - راجع التقرير)
 */
export type BroadcastNotificationEvent = BroadcastEventUnion & { extraUserIds?: string[] };

/**
 * حدث "موجّه" لمستخدم واحد بعينه بصرف النظر عن دوره - أمان/جلسات الحساب الشخصي.
 * TEST مُضاف هنا (Phase 4D) لأنه دائماً ذاتي التوجيه (المستخدم يختبر إشعاراته
 * الخاصة) - لا يمر بخريطة الأدوار العامة إطلاقاً
 */
export type TargetedNotificationEvent =
  | { type: "NEW_DEVICE_LOGIN"; data: NewDeviceLoginData; targetUserId: string }
  | { type: "ACCOUNT_LOCKED"; data: AccountLockedData; targetUserId: string }
  | { type: "PASSWORD_RESET"; data: PasswordResetData; targetUserId: string }
  | { type: "TEST"; data: TestNotificationData; targetUserId: string };

export type NotificationEvent = BroadcastNotificationEvent | TargetedNotificationEvent;

const TARGETED_TYPES = new Set<NotificationEvent["type"]>([
  "NEW_DEVICE_LOGIN",
  "ACCOUNT_LOCKED",
  "PASSWORD_RESET",
  "TEST",
]);

export function isTargetedEvent(
  event: NotificationEvent,
): event is TargetedNotificationEvent {
  return TARGETED_TYPES.has(event.type);
}

// ==================== محتوى القوالب ====================

export interface NotificationEmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface NotificationContent {
  title: string;
  body: string;
  email: NotificationEmailContent;
  sms: string;
  whatsapp: string;
}

// ==================== القنوات (Provider Pattern - نمط EmailProvider حرفياً) ====================

export interface ChannelSendPayload {
  to: string;
  title: string;
  body: string;
  html?: string;
  text?: string;
}

/**
 * عقد عام لأي مزوّد قناة تسليم خارجية.
 * configured=false (SMS/WhatsApp/Push حالياً - لا تكامل بوّابة بالكود بعد) يعني:
 * الجدولة تتخطى الصف فوراً بحالة SKIPPED بلا إهدار محاولات إعادة على فشل مؤكد.
 */
export interface ChannelProvider {
  readonly configured: boolean;
  send(payload: ChannelSendPayload): Promise<void>;
}

// ==================== Repository / Service DTOs ====================
// ملاحظة: استعلام القائمة (Page/Limit/Search/Type/Status/تاريخ) نوعه الوحيد
// ListNotificationsQueryDto المُشتق من zod بـ notification.dto.ts - لا تكرار هنا

export interface ListNotificationsResult {
  notifications: NotificationRow[];
  meta: PaginationMeta;
}

export interface PreferenceChannels {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
}

export type PreferenceMap = Record<NotificationType, PreferenceChannels>;

/** المستخدم كما يصل مع صف تسليم مستحق - notificationSettings لفحص Quiet Hours وقت الإرسال فقط */
export interface DeliveryRecipientUser {
  id: string;
  email: string;
  phone: string | null;
  notificationSettings: ChannelSettingsRow | null;
}

export type DeliveryDueRow = NotificationDelivery & {
  notification: Notification & {
    user: DeliveryRecipientUser;
  };
};

export type { Notification, NotificationDelivery };

// ==================== Phase 4D: القنوات العامة + Quiet Hours + Digest ====================

/** الصف الخام كما يعيده Prisma - يُستخدَم داخلياً بالـ Repository/Service فقط */
export interface ChannelSettingsRow {
  globalInApp: boolean;
  globalEmail: boolean;
  globalSms: boolean;
  globalWhatsapp: boolean;
  globalPush: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTimezone: string;
  digestMode: DigestMode;
}

/** الشكل العام المُعاد للعميل - نفس حقول ChannelSettingsRow، بلا id/userId/Timestamps */
export type ChannelSettings = ChannelSettingsRow;

export type ProviderStatusMap = Record<NotificationChannel, { configured: boolean }>;

export interface QueueStatus {
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
  /** عدد صفوف Outbox التي جرت عليها إعادة محاولة واحدة على الأقل (attempts > 0) */
  retries: number;
  lastProcessingAt: string | null;
}

export interface NotificationStatistics {
  unread: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  archived: number;
  sent: number;
  failed: number;
  pending: number;
}
