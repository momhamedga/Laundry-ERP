import type { UserRole } from "@prisma/client";

// ==================== Cookies ====================

export const REFRESH_COOKIE_NAME = "refresh_token";
/** الكوكي يُرسل فقط لمسارات المصادقة - يقلل سطح الهجوم */
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

// ==================== Brute Force Protection ====================

/** عدد المحاولات الفاشلة قبل قفل الحساب */
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
/** مدة قفل الحساب بالدقائق */
export const ACCOUNT_LOCK_MINUTES = 15;

// ==================== Password Reset ====================

export const RESET_TOKEN_EXPIRES_MINUTES = 30;

// ==================== RBAC Permissions ====================

export const PERMISSIONS = [
  "users:read",
  "users:manage",
  "branches:manage",
  "services:read",
  "services:manage",
  "customers:read",
  "customers:manage",
  "orders:read",
  "orders:create",
  "orders:update-status",
  "orders:cancel",
  "payments:read",
  "payments:create",
  "reports:view",
  "audit:read",
  "settings:manage",
  "invoices:read",
  "invoices:create",
  "invoices:update",
  "invoices:delete",
  "invoices:print",
  "invoices:email",
  "notifications:read",
  "notifications:update",
  "notifications:manage",
  "backup:read",
  "backup:create",
  "backup:restore",
  "backup:manage",
  "inventory:view",
  "inventory:create",
  "inventory:update",
  "inventory:delete",
  "inventory:manage",
  "supplier:view",
  "supplier:manage",
  "purchase:view",
  "purchase:manage",
  "expense:view",
  "expense:create",
  "expense:update",
  "expense:cancel",
  "barcode:view",
  "barcode:create",
  "barcode:print",
  "barcode:manage",
  "loyalty:view",
  "loyalty:manage",
  "coupon:view",
  "coupon:manage",
  "membership:view",
  "membership:manage",
  // Phase 9.5 - إغلاق اليوم المحاسبي
  "day:view",
  "day:create",
  "day:close",
  "day:reopen",
  "day:approve",
  // Phase 9.5 - إدارة الموظفين (ملفات HR)
  "employees:read",
  "employees:manage",
  // Phase 9.5 - مركز الأمان والإدارة الفائقة (سجل الدخول/الجلسات/الإخراج القسري/مصفوفة الصلاحيات)
  "security:view",
  "security:manage",
  // Phase 9.6b - الموارد البشرية (الحضور/الإجازات/الرواتب)
  "attendance:view",
  "attendance:manage",
  "leave:view",
  "leave:manage",
  "leave:approve",
  "payroll:view",
  "payroll:manage",
  "payroll:approve",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * يحسب الصلاحيات الفعلية = صلاحيات الدور + التجاوزات لكل مستخدم (Phase 9.6c).
 * granted=true يضيف صلاحية فوق الدور، granted=false يسحبها. لا يمسّ خريطة الأدوار.
 * تجاوز غير معروف (لم يعد ضمن PERMISSIONS) يُتجاهَل بأمان.
 */
export function computeEffectivePermissions(
  role: UserRole,
  overrides: readonly { permission: string; granted: boolean }[],
): Permission[] {
  const set = new Set<Permission>(ROLE_PERMISSIONS[role]);
  const valid = new Set<string>(PERMISSIONS);
  for (const o of overrides) {
    if (!valid.has(o.permission)) continue;
    if (o.granted) set.add(o.permission as Permission);
    else set.delete(o.permission as Permission);
  }
  return [...set];
}

/**
 * خريطة الدور → الصلاحيات
 * ADMIN يمتلك كل شيء ضمنياً (انظر permission.middleware)
 */
export const ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly Permission[]>> = {
  ADMIN: PERMISSIONS,
  MANAGER: [
    "users:read",
    "services:read",
    "services:manage",
    "customers:read",
    "customers:manage",
    "orders:read",
    "orders:create",
    "orders:update-status",
    "orders:cancel",
    "payments:read",
    "payments:create",
    "reports:view",
    "invoices:read",
    "invoices:create",
    "invoices:update",
    "invoices:delete",
    "invoices:print",
    "invoices:email",
    "notifications:read",
    "notifications:update",
    "inventory:view",
    "inventory:create",
    "inventory:update",
    "inventory:manage",
    "supplier:view",
    "supplier:manage",
    "purchase:view",
    "purchase:manage",
    "expense:view",
    "expense:create",
    "expense:update",
    "expense:cancel",
    "barcode:view",
    "barcode:create",
    "barcode:print",
    "barcode:manage",
    "loyalty:view",
    "loyalty:manage",
    "coupon:view",
    "coupon:manage",
    "membership:view",
    "membership:manage",
    // Phase 9.5 - المدير يدير الوردية اليومية (فتح/إغلاق/اعتماد) ويطّلع على الموظفين
    // إعادة الفتح (day:reopen) لـ ADMIN فقط
    "day:view",
    "day:create",
    "day:close",
    "day:approve",
    "employees:read",
    "security:view",
    // Phase 9.6b - المدير يدير الحضور والإجازات ويطّلع على الرواتب
    "attendance:view",
    "attendance:manage",
    "leave:view",
    "leave:manage",
    "leave:approve",
    "payroll:view",
  ],
  CASHIER: [
    "services:read",
    "customers:read",
    "customers:manage",
    "orders:read",
    "orders:create",
    "payments:read",
    "payments:create",
    "invoices:read",
    "invoices:create",
    "invoices:print",
    "invoices:email",
    "notifications:read",
    "notifications:update",
    // الكاشير يمسح الباركود بنقطة البيع ويطبع الملصقات - قراءة وطباعة فقط
    "barcode:view",
    "barcode:print",
    // الكاشير يطبّق الكوبونات ويستبدل النقاط عند إنشاء الطلب - قراءة فقط
    "loyalty:view",
    "coupon:view",
    "membership:view",
  ],
  // كل الأدوار تملك notifications:read/update - كل مستخدم يدير إشعاراته/تفضيلاته
  // الخاصة فقط (لا صلاحية تمنح رؤية/تعديل إشعارات مستخدم آخر - العزل بـ userId
  // بطبقة الـ Repository). notifications:manage (عمليات Queue/Provider/Cleanup
  // على مستوى النظام) لـ ADMIN فقط - غير مُدرَجة هنا عمداً
  WORKER: ["orders:read", "orders:update-status", "notifications:read", "notifications:update"],
  DELIVERY: [
    "orders:read",
    "orders:update-status",
    "customers:read",
    "notifications:read",
    "notifications:update",
  ],
} as const;
