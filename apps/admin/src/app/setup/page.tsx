import type { Metadata } from "next";
import { AuthGuard } from "@/components/layout/auth-guard";
import { SetupView } from "@/components/setup/setup-view";

export const metadata: Metadata = { title: "تهيئة النظام" };

/**
 * خارج مجموعة (dashboard) عمداً: المعالج لا يعرض شريطاً جانبياً ولا ترويسة —
 * روابط إلى أقسام لا تعمل بعد (لا فرع ولا خدمات) تدعو المستخدم لطريق مسدود.
 *
 * لكنه يبقى داخل AuthGuard: التهيئة عملٌ مصرَّح به لا صفحة عامة، والصلاحية
 * نفسها تُفحص داخل SetupView.
 */
export default function SetupPage() {
  return (
    <AuthGuard>
      <SetupView />
    </AuthGuard>
  );
}
