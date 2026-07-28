import { ErrorState } from "@/components/ui/error-state";

interface ResetPasswordErrorStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * غلاف فوق ErrorState الموحّد يضيف Action مخصص (رابط "طلب رابط جديد" بدل
 * زر "إعادة المحاولة" العام - لا معنى لإعادة محاولة نفس التوكين الميت).
 * يُستخدَم لحالتين حقيقيتين فقط: توكين مفقود من الرابط، أو توكين مرفوض من
 * الخادم (منتهٍ/غير صالح) بعد محاولة إرسال فعلية.
 */
export function ResetPasswordErrorState({
  title = "رابط غير صالح",
  description,
  action,
}: ResetPasswordErrorStateProps) {
  return (
    <div className="space-y-4">
      <ErrorState title={title} description={description} />
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
