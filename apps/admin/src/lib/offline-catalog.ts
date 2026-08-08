import { localMeta, offlineApi } from "@/lib/offline-router";
import type { ListServicesParams, ListServicesResult, Service } from "@/types/service";

/**
 * قراءة كتالوج الخدمات من الكاش المحلّي حين تتعذّر قاعدة البيانات.
 *
 * هذه هي الخطوة الأولى في رحلة إنشاء الطلب: بلا كتالوج يقف المعالج عند
 * اختيار الخدمة ولا يصل إلى الإنشاء أصلاً، فيصبح كل ما بعده بلا فائدة.
 *
 * الترشيح والترتيب هنا في الذاكرة لا في SQL: الكتالوج بضع مئات من الصفوف،
 * ومطابقة سلوك الخادم بدقّة أهمّ من كسب أجزاء من المللي ثانية.
 */

interface CachedServiceRow {
  id: string;
  name: string;
  category_id: string | null;
  price: number;
  unit: string | null;
  is_active: number;
}

/** يحوّل صفّ الكاش إلى شكل Service الذي تتوقّعه الواجهة */
function toService(r: CachedServiceRow): Service {
  const isActive = r.is_active === 1;
  return {
    id: r.id,
    name: r.name,
    description: null,
    // الخادم يعيد Decimal نصّاً، والواجهة تعامله كذلك في كل حساباتها
    price: String(r.price),
    unit: (r.unit ?? "PIECE") as Service["unit"],
    estimatedHours: null,
    imageUrl: null,
    isActive,
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
    categoryId: r.category_id ?? "",
    category: { id: r.category_id ?? "", name: "", isActive: true },
    // الكاش لا يحمل حالة التصنيف، ونشاط الخدمة وحده أقرب تقريب متاح
    available: isActive,
  };
}

export async function listServicesLocally(
  params: ListServicesParams,
): Promise<ListServicesResult> {
  const api = offlineApi();
  if (!api) throw new Error("الوضع دون اتصال غير متاح خارج تطبيق سطح المكتب");

  const rows = (await api.cache.read("services")) as unknown as CachedServiceRow[];
  let services = rows.map(toService);

  if (params.isActive !== undefined) {
    services = services.filter((s) => s.isActive === params.isActive);
  }
  if (params.categoryId) {
    services = services.filter((s) => s.categoryId === params.categoryId);
  }
  if (params.unit) {
    services = services.filter((s) => s.unit === params.unit);
  }
  if (params.search) {
    const q = params.search.trim().toLowerCase();
    services = services.filter((s) => s.name.toLowerCase().includes(q));
  }

  services.sort((a, b) => a.name.localeCompare(b.name, "ar"));

  const total = services.length;
  const limit = params.limit ?? 20;
  const page = params.page ?? 1;
  const pageRows = services.slice((page - 1) * limit, page * limit);

  return {
    services: pageRows,
    meta: localMeta(page, limit, total),
  };
}
