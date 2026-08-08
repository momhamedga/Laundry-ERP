import { localMeta, offlineApi } from "@/lib/offline-router";
import type { LocalCustomer } from "@/lib/offline-types";
import type {
  Customer,
  CustomerProfile,
  ListCustomersParams,
  ListCustomersResult,
} from "@/types/customer";

/**
 * قراءة العملاء من الجدول المحلّي حين تتعذّر قاعدة البيانات.
 *
 * الجدول يجمع مصدرين: عملاء بُذروا من الخادم أثناء الاتصال، وعملاء أُنشئوا
 * دون اتصال وينتظرون المزامنة. كلاهما صالح للاختيار عند إنشاء طلب.
 */

function toCustomer(c: LocalCustomer): Customer {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone ?? "",
    email: c.email,
    address: c.address,
    notes: null,
    isActive: c.is_active === 1,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

export async function listCustomersLocally(
  params: ListCustomersParams,
): Promise<ListCustomersResult> {
  const api = offlineApi();
  if (!api) throw new Error("الوضع دون اتصال غير متاح خارج تطبيق سطح المكتب");

  const limit = params.limit ?? 20;
  const page = params.page ?? 1;

  // نسحب أكثر من صفحة واحدة كي نُرقّم بعد الترشيح لا قبله
  const rows = await api.customers.list({ search: params.search, limit: 500 });
  let customers = rows.map(toCustomer);

  if (params.isActive !== undefined) {
    customers = customers.filter((c) => c.isActive === params.isActive);
  }

  const total = customers.length;
  return {
    customers: customers.slice((page - 1) * limit, page * limit),
    meta: localMeta(page, limit, total),
  };
}

/**
 * ملفّ العميل من الجدول المحلّي.
 *
 * ═══════════ لماذا إحصاءات صفرية لا محسوبة ═══════════
 * الإحصاءات (إجمالي الطلبات، المدفوع، المتبقّي) يحسبها الخادم من كامل تاريخ
 * العميل، ولا يملك الجهاز إلا ما زُامن إليه. حساب رقم ناقص وعرضه كأنه كامل
 * أسوأ من عدم عرضه: قد يقرأ الموظّف «المتبقّي 0» فيسلّم الطلب بلا تحصيل.
 *
 * معالج الطلب لا يقرأ من هذا سوى الاسم والهاتف وحالة النشاط، وهي كلها
 * متاحة محلّياً — وبدونها كان اختيار العميل ينجح ثم تنهار الخطوة التالية
 * برسالة «حدث خطأ غير متوقّع».
 */
export async function getCustomerProfileLocally(id: string): Promise<CustomerProfile> {
  const api = offlineApi();
  if (!api) throw new Error("الوضع دون اتصال غير متاح خارج تطبيق سطح المكتب");

  const row = await api.customers.get(id);
  if (!row) throw new Error("العميل غير موجود على هذا الجهاز");

  return {
    customer: toCustomer(row),
    recentOrders: [],
    stats: {
      totalOrders: 0,
      activeOrders: 0,
      totalSpent: 0,
      totalPaid: 0,
      balanceDue: 0,
      lastOrderAt: null,
    },
  };
}

/**
 * ينسخ عملاء الخادم إلى الجدول المحلّي.
 *
 * حدّ 1000 مقصود: يغطّي مغسلة نموذجية بالكامل ويمنع سحب قاعدة ضخمة إلى جهاز
 * الكاشير. الأقدم يسقط أولاً لأن الترتيب بالأحدث تعاملاً، وهو الأرجح طلباً.
 */
export async function seedCustomersFromServer(customers: Customer[]): Promise<number> {
  const api = offlineApi();
  if (!api || customers.length === 0) return 0;

  return api.customers.seed(
    customers.slice(0, 1000).map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  );
}
