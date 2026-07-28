import type { OrderStatus, PaymentMethod } from "@prisma/client";
import type {
  AccountLockedData,
  BackupCompletedData,
  BackupFailedData,
  BarcodeGeneratedData,
  CouponCreatedData,
  CouponExpiredData,
  CouponUsedData,
  DayOpenedData,
  DayClosedData,
  DayReopenedData,
  InvalidScanData,
  InvoiceCreatedData,
  InvoiceSentData,
  LabelPrintedData,
  LowStockData,
  LowStockScannedData,
  MembershipChangedData,
  NewDeviceLoginData,
  OutOfStockData,
  PointsEarnedData,
  PointsExpiredData,
  PointsRedeemedData,
  PurchaseCancelledData,
  PurchaseReceivedData,
  StockAdjustedData,
  NotificationContent,
  NotificationEvent,
  OrderCancelledData,
  OrderCreatedData,
  OrderStatusChangedData,
  PasswordResetData,
  PaymentCancelledData,
  PaymentReceivedData,
  PaymentRefundedData,
  SystemSettingsUpdatedData,
  UserCreatedData,
  UserDisabledData,
} from "./notification.types.js";

const APP_NAME = "Laundry ERP";

/**
 * تسميات/تنسيق عربية محلية لهذا الملف حصراً - المصدر الوحيد لأي نص يظهر
 * للمستخدم بالإشعارات. Modules الأخرى (orders/payments/...) تمرر قيماً خاماً
 * فقط (enums/أرقام) ولا تكتب جملاً جاهزة إطلاقاً (قاعدة صريحة لمرحلة 4B).
 */
const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: "مستلم",
  INSPECTING: "فحص",
  WASHING: "غسيل",
  DRYING: "تجفيف",
  IRONING: "كي",
  PACKING: "تغليف",
  READY: "جاهز",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي",
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "نقدي",
  CARD: "بطاقة",
  BANK_TRANSFER: "تحويل بنكي",
  MOBILE_WALLET: "محفظة إلكترونية",
};

/**
 * لا استعلام إضافي لجلب عملة الإعدادات الحية عند كل حدث (قيد أداء متعمّد -
 * راجع "Performance Notes" بالتقرير) - لاحقة ثابتة مطابقة لافتراضي
 * SystemSettings.defaultCurrency بالـ Schema
 */
const CURRENCY_SUFFIX = "ج.م";

function formatMoney(amount: number): string {
  return `${amount.toFixed(2)} ${CURRENCY_SUFFIX}`;
}

/** غلاف HTML مشترك - نفس هيكل قوالب وحدة email (email.templates.ts) بالضبط */
function wrapEmailHtml(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Tahoma,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color:#0f172a;padding:24px 32px;text-align:center;">
                <span style="color:#ffffff;font-size:20px;font-weight:bold;">${APP_NAME}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;text-align:right;">
                <h1 style="margin:0 0 16px;font-size:18px;color:#0f172a;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">${text}</p>`;
}

/** يبني NotificationContent كاملاً من title/body فقط - كل الأنواع تشترك بنفس شكل الإخراج */
function content(title: string, body: string): NotificationContent {
  return {
    title,
    body,
    email: {
      subject: `${title} - ${APP_NAME}`,
      html: wrapEmailHtml(title, paragraph(body)),
      text: `${title}\n\n${body}`,
    },
    sms: `${title}: ${body}`,
    whatsapp: `*${title}*\n${body}`,
  };
}

// ==================== Orders ====================

function buildOrderCreated(data: OrderCreatedData): NotificationContent {
  return content(
    `طلب جديد ${data.orderNumber}`,
    `أنشأ ${data.createdByName} طلباً جديداً للعميل ${data.customerName}`,
  );
}

function buildOrderStatusChanged(data: OrderStatusChangedData): NotificationContent {
  const oldLabel = data.oldStatus ? ORDER_STATUS_LABELS[data.oldStatus] : null;
  const newLabel = ORDER_STATUS_LABELS[data.newStatus];
  const body = oldLabel
    ? `غيّر ${data.changedByEmail} حالة طلب ${data.customerName} (${data.orderNumber}) من "${oldLabel}" إلى "${newLabel}"`
    : `غيّر ${data.changedByEmail} حالة طلب ${data.customerName} (${data.orderNumber}) إلى "${newLabel}"`;
  return content(`تحديث حالة الطلب ${data.orderNumber}`, body);
}

function buildOrderCancelled(data: OrderCancelledData): NotificationContent {
  const body = data.reason
    ? `ألغى ${data.cancelledByEmail} طلب ${data.customerName} (${data.orderNumber}) - السبب: ${data.reason}`
    : `ألغى ${data.cancelledByEmail} طلب ${data.customerName} (${data.orderNumber})`;
  return content(`إلغاء الطلب ${data.orderNumber}`, body);
}

// ==================== Payments ====================

function buildPaymentReceived(data: PaymentReceivedData): NotificationContent {
  return content(
    `دفعة جديدة على طلب ${data.orderNumber}`,
    `سجّل ${data.receivedByName} دفعة ${formatMoney(data.amount)} (${PAYMENT_METHOD_LABELS[data.method]})`,
  );
}

function buildPaymentRefunded(data: PaymentRefundedData): NotificationContent {
  return content(
    `استرداد دفعة على طلب ${data.orderNumber}`,
    `استرد ${data.refundedByEmail} مبلغ ${formatMoney(data.refundAmount)} من دفعة على الطلب ${data.orderNumber}`,
  );
}

function buildPaymentCancelled(data: PaymentCancelledData): NotificationContent {
  return content(
    `إلغاء دفعة على طلب ${data.orderNumber}`,
    `ألغى ${data.cancelledByEmail} دفعة ${formatMoney(data.amount)} على الطلب ${data.orderNumber}`,
  );
}

// ==================== Invoices ====================

function buildInvoiceCreated(data: InvoiceCreatedData): NotificationContent {
  return content(
    `فاتورة جديدة ${data.invoiceNumber}`,
    `أصدر ${data.createdByName} فاتورة بقيمة ${formatMoney(data.total)} للعميل ${data.customerName} (طلب ${data.orderNumber})`,
  );
}

function buildInvoiceSent(data: InvoiceSentData): NotificationContent {
  return content(
    `تم إرسال الفاتورة ${data.invoiceNumber}`,
    `أُرسلت فاتورة ${data.customerName} بالبريد إلى ${data.sentTo}`,
  );
}

// ==================== Backup ====================

function buildBackupCompleted(data: BackupCompletedData): NotificationContent {
  return content(
    "اكتملت النسخة الاحتياطية",
    `نفّذ ${data.triggeredByEmail} تنزيل نسخة احتياطية من النظام بنجاح`,
  );
}

function buildBackupFailed(data: BackupFailedData): NotificationContent {
  return content(
    "فشلت النسخة الاحتياطية",
    `فشلت محاولة ${data.triggeredByEmail} لتنزيل نسخة احتياطية: ${data.errorMessage}`,
  );
}

// ==================== Inventory (Phase 7) ====================

function buildLowStock(data: LowStockData): NotificationContent {
  return content(
    "نقص في المخزون",
    `الصنف "${data.itemName}" (${data.sku}) وصل إلى ${data.quantity} - حدّ إعادة الطلب ${data.reorderLevel}`,
  );
}

function buildOutOfStock(data: OutOfStockData): NotificationContent {
  return content(
    "نفاد المخزون",
    `الصنف "${data.itemName}" (${data.sku}) نفد بالكامل من المخزون`,
  );
}

function buildPurchaseReceived(data: PurchaseReceivedData): NotificationContent {
  return content(
    "استلام أمر شراء",
    `تم استلام أمر الشراء ${data.purchaseNumber} من ${data.supplierName} بقيمة ${formatMoney(data.total)}`,
  );
}

function buildPurchaseCancelled(data: PurchaseCancelledData): NotificationContent {
  return content(
    "إلغاء أمر شراء",
    `أُلغي أمر الشراء ${data.purchaseNumber} من ${data.supplierName}`,
  );
}

function buildStockAdjusted(data: StockAdjustedData): NotificationContent {
  return content(
    "تعديل مخزون",
    `عدّل ${data.actorEmail} رصيد "${data.itemName}" (${data.sku}) من ${data.previousQuantity} إلى ${data.newQuantity}`,
  );
}

// ==================== Barcode (Phase 8) ====================

function buildBarcodeGenerated(data: BarcodeGeneratedData): NotificationContent {
  return content(
    "توليد باركود",
    `تم توليد باركود (${data.barcodeType}) للصنف "${data.itemName}" (${data.sku})`,
  );
}

function buildLabelPrinted(data: LabelPrintedData): NotificationContent {
  return content(
    "طباعة ملصقات",
    `طبع ${data.actorEmail} ${data.labelCount} ملصقاً لـ${data.itemCount} صنف`,
  );
}

function buildLowStockScanned(data: LowStockScannedData): NotificationContent {
  return content(
    "مسح صنف منخفض المخزون",
    `الصنف الممسوح "${data.itemName}" (${data.sku}) منخفض المخزون - الرصيد ${data.quantity}`,
  );
}

function buildInvalidScan(data: InvalidScanData): NotificationContent {
  return content("مسح غير صالح", `الكود الممسوح "${data.code}" لا يطابق أي صنف`);
}

// ==================== Loyalty / Membership / Coupons (Phase 9) ====================

function buildPointsEarned(data: PointsEarnedData): NotificationContent {
  return content(
    "اكتساب نقاط",
    `كسب العميل "${data.customerName}" ${data.points} نقطة (الرصيد ${data.balance})`,
  );
}

function buildPointsRedeemed(data: PointsRedeemedData): NotificationContent {
  return content(
    "استبدال نقاط",
    `استبدل العميل "${data.customerName}" ${data.points} نقطة بخصم ${formatMoney(data.discountAmount)}`,
  );
}

function buildPointsExpired(data: PointsExpiredData): NotificationContent {
  return content("انتهاء نقاط", `انتهت ${data.points} نقطة للعميل "${data.customerName}"`);
}

function buildMembershipChanged(data: MembershipChangedData, up: boolean): NotificationContent {
  return content(
    up ? "ترقية عضوية" : "تخفيض عضوية",
    `${up ? "تُرقّي" : "خُفِّض"} العميل "${data.customerName}" إلى مستوى ${data.level}`,
  );
}

function buildCouponCreated(data: CouponCreatedData): NotificationContent {
  return content("كوبون جديد", `أُنشئ الكوبون "${data.code}" (${data.couponType})`);
}

function buildCouponExpired(data: CouponExpiredData): NotificationContent {
  return content("انتهاء كوبون", `انتهت صلاحية الكوبون "${data.code}"`);
}

function buildCouponUsed(data: CouponUsedData): NotificationContent {
  return content(
    "استخدام كوبون",
    `استخدم العميل "${data.customerName}" الكوبون "${data.code}" بخصم ${formatMoney(data.discountAmount)}`,
  );
}

// ==================== Day Closing (Phase 9.5) ====================

function buildDayOpened(data: DayOpenedData): NotificationContent {
  return content(
    `فتح يوم العمل ${data.businessDate}`,
    `فتح ${data.openedByEmail} وردية يوم ${data.businessDate} برصيد افتتاحي ${formatMoney(data.openingCash)}`,
  );
}

function buildDayClosed(data: DayClosedData): NotificationContent {
  const diff = data.cashDifference;
  const diffLabel =
    diff === 0
      ? "لا فرق في الصندوق"
      : diff > 0
        ? `زيادة ${formatMoney(diff)} في الصندوق`
        : `عجز ${formatMoney(Math.abs(diff))} في الصندوق`;
  return content(
    `إغلاق يوم العمل ${data.businessDate}`,
    `أغلق ${data.closedByEmail} وردية يوم ${data.businessDate} - إجمالي الإيراد ${formatMoney(data.totalRevenue)} (${diffLabel})`,
  );
}

function buildDayReopened(data: DayReopenedData): NotificationContent {
  return content(
    `إعادة فتح يوم العمل ${data.businessDate}`,
    `أعاد ${data.reopenedByEmail} فتح وردية يوم ${data.businessDate} - السبب: ${data.reason}`,
  );
}

// ==================== Settings ====================

function buildSettingsUpdated(data: SystemSettingsUpdatedData): NotificationContent {
  const sections = data.changedSections.length > 0 ? data.changedSections.join("، ") : "إعدادات عامة";
  return content(
    "تحديث إعدادات النظام",
    `حدّث ${data.updatedByEmail} إعدادات النظام (${sections})`,
  );
}

// ==================== Users ====================

function buildUserCreated(data: UserCreatedData): NotificationContent {
  return content(
    "مستخدم جديد",
    `أنشأ ${data.createdByEmail} حساباً جديداً لـ ${data.userName} (${data.userEmail})`,
  );
}

function buildUserDisabled(data: UserDisabledData): NotificationContent {
  return content("تعطيل مستخدم", `تم تعطيل حساب المستخدم ${data.userName}`);
}

// ==================== Security ====================

function buildNewDeviceLogin(data: NewDeviceLoginData): NotificationContent {
  const device = data.userAgent ?? "جهاز غير معروف";
  const ip = data.ipAddress ?? "غير معروف";
  return content(
    "تسجيل دخول من جهاز جديد",
    `سُجِّل دخول جديد لحسابك من ${device} (IP: ${ip}) في ${data.loginAt}. إن لم يكن أنت، غيّر كلمة المرور فوراً.`,
  );
}

function buildAccountLocked(data: AccountLockedData): NotificationContent {
  return content(
    "تم قفل حسابك مؤقتاً",
    `قُفل حسابك بعد ${data.attempts} محاولات دخول فاشلة، حتى ${data.lockedUntil}. إن لم تكن أنت من حاول الدخول، غيّر كلمة المرور فور استعادة الوصول.`,
  );
}

function buildPasswordReset(data: PasswordResetData): NotificationContent {
  return content(
    "تم إعادة تعيين كلمة المرور",
    `تمت إعادة تعيين كلمة مرور حسابك بنجاح في ${data.resetAt}. إن لم تكن أنت، تواصل مع الإدارة فوراً.`,
  );
}

/** Phase 4D - زر "إرسال إشعار اختباري" بإعدادات الإشعارات - محتوى ثابت، لا بيانات حدث حقيقية */
function buildTest(): NotificationContent {
  return content("إشعار اختباري", "هذا إشعار اختباري للتأكد من عمل الإشعارات داخل التطبيق والبريد.");
}

/** محرّك القوالب المركزي - نقطة الدخول الوحيدة لتحويل حدث إلى محتوى قابل للتسليم على كل القنوات */
export function buildNotificationContent(event: NotificationEvent): NotificationContent {
  switch (event.type) {
    case "ORDER_CREATED":
      return buildOrderCreated(event.data);
    case "ORDER_STATUS_CHANGED":
      return buildOrderStatusChanged(event.data);
    case "ORDER_CANCELLED":
      return buildOrderCancelled(event.data);
    case "PAYMENT_RECEIVED":
      return buildPaymentReceived(event.data);
    case "PAYMENT_REFUNDED":
      return buildPaymentRefunded(event.data);
    case "PAYMENT_CANCELLED":
      return buildPaymentCancelled(event.data);
    case "INVOICE_CREATED":
      return buildInvoiceCreated(event.data);
    case "INVOICE_SENT":
      return buildInvoiceSent(event.data);
    case "BACKUP_COMPLETED":
      return buildBackupCompleted(event.data);
    case "BACKUP_FAILED":
      return buildBackupFailed(event.data);
    case "SYSTEM_SETTINGS_UPDATED":
      return buildSettingsUpdated(event.data);
    case "USER_CREATED":
      return buildUserCreated(event.data);
    case "USER_DISABLED":
      return buildUserDisabled(event.data);
    case "LOW_STOCK":
      return buildLowStock(event.data);
    case "OUT_OF_STOCK":
      return buildOutOfStock(event.data);
    case "PURCHASE_RECEIVED":
      return buildPurchaseReceived(event.data);
    case "PURCHASE_CANCELLED":
      return buildPurchaseCancelled(event.data);
    case "STOCK_ADJUSTED":
      return buildStockAdjusted(event.data);
    case "BARCODE_GENERATED":
      return buildBarcodeGenerated(event.data);
    case "LABEL_PRINTED":
      return buildLabelPrinted(event.data);
    case "LOW_STOCK_SCANNED":
      return buildLowStockScanned(event.data);
    case "INVALID_SCAN":
      return buildInvalidScan(event.data);
    case "POINTS_EARNED":
      return buildPointsEarned(event.data);
    case "POINTS_REDEEMED":
      return buildPointsRedeemed(event.data);
    case "POINTS_EXPIRED":
      return buildPointsExpired(event.data);
    case "MEMBERSHIP_UPGRADED":
      return buildMembershipChanged(event.data, true);
    case "MEMBERSHIP_DOWNGRADED":
      return buildMembershipChanged(event.data, false);
    case "COUPON_CREATED":
      return buildCouponCreated(event.data);
    case "COUPON_EXPIRED":
      return buildCouponExpired(event.data);
    case "COUPON_USED":
      return buildCouponUsed(event.data);
    case "DAY_OPENED":
      return buildDayOpened(event.data);
    case "DAY_CLOSED":
      return buildDayClosed(event.data);
    case "DAY_REOPENED":
      return buildDayReopened(event.data);
    case "NEW_DEVICE_LOGIN":
      return buildNewDeviceLogin(event.data);
    case "ACCOUNT_LOCKED":
      return buildAccountLocked(event.data);
    case "PASSWORD_RESET":
      return buildPasswordReset(event.data);
    case "TEST":
      return buildTest();
  }
}
