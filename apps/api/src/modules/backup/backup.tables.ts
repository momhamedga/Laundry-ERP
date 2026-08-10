/**
 * سِجِلّ جداول النسخة الاحتياطية — مصدر الحقيقة الوحيد للتصدير والاستعادة معاً.
 *
 * لماذا سِجِلّ واحد لا قائمتان:
 * كانت النسخة تصدّر 10 جداول من 48. لم يكن ذلك قراراً بل تراكم إهمال — كل مرحلة
 * أضافت نماذج (الفواتير، المخزون، المشتريات، الولاء، الموارد البشرية، إغلاق
 * اليوم) ولم يتذكّر أحد تحديث وحدة النسخ الاحتياطي. النتيجة نسخة تبدو ناجحة
 * وتفقدك عند الاستعادة الفواتير والمخزون والرواتب والإغلاقات المحاسبية.
 * قائمتان منفصلتان (تصدير/استعادة) كانتا ستنحرفان عن بعضهما بالطريقة نفسها.
 *
 * وحارس هذا السِجِلّ اختبارٌ يقرأ schema.prisma ويسقط إن وُجد نموذج غير مصنَّف
 * هنا — لا مُدرَجاً ولا مستثنى بسبب. إضافة نموذج جديد بلا قرار صريح تُوقف CI.
 *
 * الترتيب مُستخرَج طوبولوجياً من علاقات المخطّط (الآباء قبل الأبناء) لا يدوياً:
 * إدراج ابن قبل أبيه يفشل بقيد مفتاح أجنبي في منتصف معاملة الاستعادة.
 */

export interface BackupTable {
  /** اسم النموذج كما في schema.prisma — عليه يعتمد حارس التغطية */
  readonly model: string;
  /** مفتاح الـdelegate في عميل Prisma (camelCase) */
  readonly delegate: string;
  /** المفتاح داخل ملف النسخة — أسماء الجداول العشرة القديمة محفوظة كما هي */
  readonly key: string;
}

/**
 * الجداول المشمولة، مرتّبة ترتيباً آمناً للإدراج.
 *
 * users وsettings مُدرجان هنا للتغطية والعدّ، لكن لهما معالجة خاصة في
 * المستودع: users لأن النسخة لا تحمل passwordHash، وsettings لأنه مفرد لا مصفوفة.
 */
export const BACKUP_TABLES: readonly BackupTable[] = [
  // — الجذور (بلا آباء) —
  { model: "BackupSettings", delegate: "backupSettings", key: "backupSettings" },
  { model: "Branch", delegate: "branch", key: "branches" },
  { model: "Campaign", delegate: "campaign", key: "campaigns" },
  { model: "Coupon", delegate: "coupon", key: "coupons" },
  { model: "Customer", delegate: "customer", key: "customers" },
  { model: "DayClosing", delegate: "dayClosing", key: "dayClosings" },
  { model: "LoyaltySettings", delegate: "loyaltySettings", key: "loyaltySettings" },
  { model: "MembershipTierConfig", delegate: "membershipTierConfig", key: "membershipTierConfigs" },
  { model: "PayrollRun", delegate: "payrollRun", key: "payrollRuns" },
  { model: "ServiceCategory", delegate: "serviceCategory", key: "serviceCategories" },
  { model: "Supplier", delegate: "supplier", key: "suppliers" },
  { model: "SystemSettings", delegate: "systemSettings", key: "settings" },

  // — المستوى الأول —
  { model: "CouponRedemption", delegate: "couponRedemption", key: "couponRedemptions" },
  { model: "LoyaltyAccount", delegate: "loyaltyAccount", key: "loyaltyAccounts" },
  { model: "LoyaltyTransaction", delegate: "loyaltyTransaction", key: "loyaltyTransactions" },
  { model: "Service", delegate: "service", key: "services" },
  { model: "User", delegate: "user", key: "users" },

  // — يعتمد على المستخدم —
  { model: "AuditLog", delegate: "auditLog", key: "auditLogs" },
  { model: "EmployeeProfile", delegate: "employeeProfile", key: "employeeProfiles" },
  { model: "LabelTemplate", delegate: "labelTemplate", key: "labelTemplates" },
  { model: "Notification", delegate: "notification", key: "notifications" },
  { model: "NotificationPreference", delegate: "notificationPreference", key: "notificationPreferences" },
  { model: "Order", delegate: "order", key: "orders" },
  { model: "Purchase", delegate: "purchase", key: "purchases" },
  { model: "UserNotificationSettings", delegate: "userNotificationSettings", key: "userNotificationSettings" },
  { model: "UserPermissionOverride", delegate: "userPermissionOverride", key: "userPermissionOverrides" },

  // — المستوى الثاني —
  { model: "AttendanceRecord", delegate: "attendanceRecord", key: "attendanceRecords" },
  { model: "EmployeeDocument", delegate: "employeeDocument", key: "employeeDocuments" },
  { model: "InventoryItem", delegate: "inventoryItem", key: "inventoryItems" },
  { model: "Invoice", delegate: "invoice", key: "invoices" },
  { model: "LeaveBalance", delegate: "leaveBalance", key: "leaveBalances" },
  { model: "LeaveRequest", delegate: "leaveRequest", key: "leaveRequests" },
  { model: "NotificationDelivery", delegate: "notificationDelivery", key: "notificationDeliveries" },
  { model: "OrderItem", delegate: "orderItem", key: "orderItems" },
  { model: "OrderStatusHistory", delegate: "orderStatusHistory", key: "orderStatusHistory" },
  { model: "Payment", delegate: "payment", key: "payments" },
  { model: "Payslip", delegate: "payslip", key: "payslips" },
  { model: "SalaryComponent", delegate: "salaryComponent", key: "salaryComponents" },

  // — المستوى الثالث —
  { model: "BarcodeScanLog", delegate: "barcodeScanLog", key: "barcodeScanLogs" },
  { model: "InventoryAdjustment", delegate: "inventoryAdjustment", key: "inventoryAdjustments" },
  { model: "InventoryAlert", delegate: "inventoryAlert", key: "inventoryAlerts" },
  { model: "InventorySnapshot", delegate: "inventorySnapshot", key: "inventorySnapshots" },
  { model: "InventoryTransaction", delegate: "inventoryTransaction", key: "inventoryTransactions" },
  { model: "InvoiceItem", delegate: "invoiceItem", key: "invoiceItems" },
  { model: "LabelPrintLog", delegate: "labelPrintLog", key: "labelPrintLogs" },
  { model: "PurchaseItem", delegate: "purchaseItem", key: "purchaseItems" },
];

/**
 * النماذج المستثناة عمداً، وسببُ كلٍّ منها.
 *
 * الاستثناء قرار يُكتب سببه، لا سهو. الحارس يقبل النموذج مستثنى بشرط وجوده هنا.
 */
export const EXCLUDED_MODELS: Readonly<Record<string, string>> = {
  RefreshToken:
    "أسرار جلسات قصيرة الأجل. استعادتها تُحيي جلسات كان يُفترض أنها انتهت، ولا يفقد المستخدم شيئاً بغيابها — يسجّل الدخول من جديد.",
  BackupRecord:
    "سجلّ تشغيلي عن ملفات النسخ نفسها. استعادته تُنشئ سجلّات تشير إلى ملفات غير موجودة — أي إعادة إنتاج لعطل «النسخ الوهمية» الذي تعالجه هذه الوحدة.",
};

/** مفتاح جدول المستخدمين — معالجة خاصة (بلا passwordHash) */
export const USERS_KEY = "users";
/** مفتاح الإعدادات العامة — مفرد لا مصفوفة */
export const SETTINGS_KEY = "settings";
