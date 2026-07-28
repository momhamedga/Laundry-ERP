import { ErrorState } from "@/components/ui/error-state";

interface ForgotPasswordErrorStateProps {
  description?: string;
  onRetry: () => void;
}

/**
 * تُستخدَم فقط لفشل بنيوي حقيقي (لا اتصال بالخادم / 500) - وليس لأخطاء
 * قابلة لإعادة المحاولة فوراً (429 أو تحقق) التي تبقى Inline داخل النموذج
 * نفسه (نفس نمط كل نماذج المشروع الأخرى) بلا فقدان ما كتبه المستخدم.
 */
export function ForgotPasswordErrorState({ description, onRetry }: ForgotPasswordErrorStateProps) {
  return <ErrorState title="تعذر إرسال الطلب" description={description} onRetry={onRetry} />;
}
