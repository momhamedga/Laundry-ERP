import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarCheck,
  CalendarClock,
  Crown,
  CreditCard,
  DatabaseBackup,
  FileText,
  Gift,
  IdCard,
  QrCode,
  ShieldCheck,
  Star,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Truck,
  UserCog,
  Users,
} from "lucide-react";
import type { Permission } from "@/constants/permissions";
import type { NavItem as BaseNavItem } from "@/types";

export interface NavItem extends BaseNavItem {
  /** إخفاء الرابط إن لم يملك المستخدم هذه الصلاحية - غيابه يعني ظهور دائم */
  permission?: Permission;
}

export interface NavGroup {
  /** عنوان القسم - يظهر فوق مجموعة الروابط (يُخفى في وضع الطي) */
  label: string;
  items: readonly NavItem[];
}

/**
 * أقسام الشريط الجانبي - مصدر واحد للتنقل. التجميع في أقسام معنونة (نمط حديث)
 * بدل قائمة مسطّحة طويلة، مع بقاء NAV_ITEMS مشتقاً منها للـ Breadcrumb.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "الرئيسية",
    items: [{ title: "لوحة التحكم", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "العمليات",
    items: [
      { title: "العملاء", href: "/customers", icon: Users, permission: "customers:read" },
      { title: "الخدمات", href: "/services", icon: Sparkles, permission: "services:read" },
      { title: "الطلبات", href: "/orders", icon: ShoppingCart, permission: "orders:read" },
      { title: "المدفوعات", href: "/payments", icon: CreditCard, permission: "payments:read" },
      { title: "الفواتير", href: "/invoices", icon: FileText, permission: "invoices:read" },
      { title: "إغلاق اليوم", href: "/day-closing", icon: CalendarCheck, permission: "day:view" },
    ],
  },
  {
    label: "المخزون",
    items: [
      { title: "المخزون", href: "/inventory", icon: Boxes, permission: "inventory:view" },
      { title: "الموردون", href: "/suppliers", icon: Truck, permission: "supplier:view" },
      { title: "المشتريات", href: "/purchases", icon: ShoppingBag, permission: "purchase:view" },
      { title: "الباركود", href: "/barcodes", icon: QrCode, permission: "barcode:view" },
    ],
  },
  {
    label: "الولاء والتسويق",
    items: [
      { title: "الولاء", href: "/loyalty", icon: Star, permission: "loyalty:view" },
      { title: "الكوبونات", href: "/coupons", icon: Gift, permission: "coupon:view" },
      { title: "العضوية", href: "/membership", icon: Crown, permission: "membership:view" },
    ],
  },
  {
    label: "التحليلات",
    items: [
      { title: "التقارير", href: "/reports", icon: BarChart3, permission: "reports:view" },
      { title: "الإشعارات", href: "/notifications", icon: Bell, permission: "notifications:read" },
    ],
  },
  {
    label: "النظام",
    items: [
      { title: "المستخدمون", href: "/users", icon: UserCog, permission: "users:read" },
      { title: "الموظفون", href: "/employees", icon: IdCard, permission: "employees:read" },
      { title: "الموارد البشرية", href: "/hr", icon: CalendarClock, permission: "attendance:view" },
      { title: "الأمان", href: "/admin", icon: ShieldCheck, permission: "security:view" },
      { title: "الفروع", href: "/branches", icon: Building2 },
      { title: "النسخ الاحتياطي", href: "/backup", icon: DatabaseBackup, permission: "backup:read" },
      { title: "الإعدادات", href: "/settings", icon: Settings },
    ],
  },
] as const;

/** قائمة مسطّحة مشتقة - للـ Breadcrumb وأي بحث بالمسار (مصدر واحد) */
export const NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** عنوان الصفحة من المسار - للـ Breadcrumb */
export function titleForPath(pathname: string): string {
  const item = NAV_ITEMS.find((n) => n.href !== "/" && pathname.startsWith(n.href));
  return item?.title ?? "لوحة التحكم";
}
