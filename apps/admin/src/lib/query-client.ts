import { QueryClient } from "@tanstack/react-query";

/**
 * إعدادات TanStack Query الافتراضية للوحة.
 *
 * ═══════════ لماذا networkMode: "always" ═══════════
 * الافتراضي "online" يوقف كل استعلام حين يصير navigator.onLine مساوياً false،
 * فلا تُستدعى دالة الجلب إطلاقاً — تبقى في حالة paused. وهذا يُبطل طبقة
 * الأوفلاين بالكامل: الموجّه لا يُسأل، فلا يُقرأ من SQLite المحلّية، ويرى
 * المستخدم قائمة فارغة بلا أي أثر في السجلّ يفسّر السبب.
 *
 * ولا معنى لذلك الافتراض هنا أصلاً: مسار الأوفلاين لا يلمس الشبكة، بل يمرّ
 * عبر IPC إلى قاعدة محلّية على القرص. أما المسار البعيد فالخادم مُدمج على
 * 127.0.0.1 ويبقى بالغاً حتى بلا إنترنت.
 *
 * "always" يعني: نفّذ دائماً ودع الموجّه يقرّر المصدر — وهو القرار الصحيح
 * لأنه وحده يعرف الفرق بين «لا إنترنت» و«لا قاعدة بيانات».
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
        networkMode: "always",
      },
      mutations: {
        // إنشاء الطلب والدفعة دون اتصال كتابات محلّية، لا يجوز تجميدها
        networkMode: "always",
      },
    },
  });
}
