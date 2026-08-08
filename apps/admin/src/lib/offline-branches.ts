import { offlineApi } from "@/lib/offline-router";
import type { Branch } from "@/types/branch";

/**
 * الفروع من الكاش المحلّي.
 *
 * خطوة المراجعة في معالج الطلب تطلب الفروع النشطة، فبلا هذا ينجح اختيار
 * العميل والخدمات ثم تنهار الخطوة الأخيرة — أسوأ نقطة للانهيار لأن الموظّف
 * يكون قد أدخل الطلب كاملاً.
 */

interface CachedBranchRow {
  id: string;
  name: string;
  is_active: number;
}

export async function listActiveBranchesLocally(): Promise<Branch[]> {
  const api = offlineApi();
  if (!api) throw new Error("الوضع دون اتصال غير متاح خارج تطبيق سطح المكتب");

  const rows = (await api.cache.read("branches")) as unknown as CachedBranchRow[];

  return rows
    .filter((r) => r.is_active === 1)
    .map(
      (r) =>
        ({
          id: r.id,
          name: r.name,
          isActive: true,
        }) as Branch,
    )
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}
