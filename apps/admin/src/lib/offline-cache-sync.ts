import { desktopBridge } from "@/lib/desktop";
import { seedCustomersFromServer } from "@/lib/offline-customers";
import { offlineApi } from "@/lib/offline-router";
import * as branchesService from "@/services/branches.service";
import * as customersService from "@/services/customers.service";
import * as categoriesService from "@/services/service-categories.service";
import * as servicesService from "@/services/services.service";

/**
 * يملأ الكاش المحلّي من الخادم أثناء الاتصال.
 *
 * ═══════════ لماذا هذا شرط لعمل الأوفلاين أصلاً ═══════════
 * قاعدة SQLite تستقبل ما يُكتب دون اتصال، لكنها تولد فارغة من بيانات القراءة:
 * لا كتالوج خدمات ولا عملاء. وبلا كتالوج لا يستطيع المستخدم اختيار خدمة ولا
 * نستطيع تسعير بند، فينهار إنشاء الطلب دون اتصال قبل أن يبدأ.
 *
 * ═══════════ لماذا نُرقّم ولا نطلب دفعة واحدة ═══════════
 * الخادم يرفض أي limit فوق 100 بـ 400. المحاولة الأولى هنا طلبت 500 فرُفضت
 * صامتةً — أُبتلع الخطأ في catch — فبقي الكاش فارغاً ولم يظهر ذلك إلا حين
 * قطع المستخدم الإنترنت فلم يجد عميلاً واحداً. لذلك نمرّ صفحةً صفحة.
 *
 * يفشل بصمت: تعذّر تحديث الكاش لا يجوز أن يمنع العمل أونلاين، وأسوأ ما
 * يحدث أن يبقى كاش الأمس.
 */

/** أقصى ما يقبله الخادم في الطلب الواحد */
const PAGE = 100;

/** سقف الجلب لكل كيان — يغطّي مغسلة نموذجية بلا سحب قاعدة ضخمة للكاشير */
const MAX_ROWS = 1000;

/** يجمع كل الصفحات حتى نفادها أو بلوغ السقف */
async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<{ rows: T[]; totalPages: number }>,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const { rows, totalPages: tp } = await fetchPage(page, PAGE);
    all.push(...rows);
    totalPages = tp;
    page++;
  } while (page <= totalPages && all.length < MAX_ROWS);

  return all.slice(0, MAX_ROWS);
}

/**
 * يُعلن فشل تحديث الكاش بدل ابتلاعه.
 *
 * الصمت هنا كلّف دورة بناء كاملة: رفض الخادم limit=500 بـ 400 فبقي الكاش
 * فارغاً، ولم يظهر ذلك إلا حين قطع المستخدم الإنترنت على جهازه.
 */
function warn(entity: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  desktopBridge()?.log?.("warn", `offline-cache: تعذّر تحديث ${entity} — ${msg}`);
}

export async function refreshOfflineCache(): Promise<Record<string, number>> {
  const api = offlineApi();
  if (!api) return {};

  const written: Record<string, number> = {};

  try {
    const services = await fetchAllPages(async (page, limit) => {
      const r = await servicesService.listServices({ page, limit, isActive: true });
      return { rows: r.services, totalPages: r.meta.totalPages };
    });
    if (services.length > 0) {
      written.services = await api.cache.put(
        "services",
        services.map((s) => ({
          id: s.id,
          name: s.name,
          category_id: s.categoryId,
          // price يصل نصّاً (Decimal) وعمود SQLite من نوع REAL
          price: Number(s.price),
          unit: s.unit,
          is_active: s.isActive ? 1 : 0,
        })),
      );
    }
  } catch (err) {
    warn("services", err);
  }

  try {
    const categories = await fetchAllPages(async (page, limit) => {
      const r = await categoriesService.listCategories({ page, limit });
      return { rows: r.categories, totalPages: r.meta.totalPages };
    });
    if (categories.length > 0) {
      written.categories = await api.cache.put(
        "categories",
        categories.map((c) => ({ id: c.id, name: c.name, sort_order: c.sortOrder })),
      );
    }
  } catch (err) {
    warn("categories", err);
  }

  try {
    const branches = await branchesService.listActiveBranches();
    if (branches.length > 0) {
      written.branches = await api.cache.put(
        "branches",
        branches.map((b) => ({ id: b.id, name: b.name, is_active: b.isActive ? 1 : 0 })),
      );
    }
  } catch (err) {
    warn("branches", err);
  }

  try {
    const customers = await fetchAllPages(async (page, limit) => {
      const r = await customersService.listCustomers({ page, limit, isActive: true });
      return { rows: r.customers, totalPages: r.meta.totalPages };
    });
    if (customers.length > 0) {
      written.customers = await seedCustomersFromServer(customers);
    }
  } catch (err) {
    warn("customers", err);
  }

  // تسجيل النتيجة لا الفشل وحده: «صفر عميل مكتوب» يبدو نجاحاً صامتاً بينما
  // هو العطل نفسه، ولا سبيل لتمييزه عن نجاح حقيقي بلا هذا السطر.
  const summary = Object.entries(written)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  desktopBridge()?.log?.(
    "info",
    `offline-cache: اكتمل — ${summary || "لم يُكتب شيء"}`,
  );

  return written;
}
