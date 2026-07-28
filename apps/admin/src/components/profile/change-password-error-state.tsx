import { ErrorState } from "@/components/ui/error-state";

interface ChangePasswordErrorStateProps {
  description?: string;
  onRetry: () => void;
}

/** خطأ تحميل سياق الحساب (البريد المعروض بالأعلى) - غلاف بعنوان ثابت فوق ErrorState الموحد */
export function ChangePasswordErrorState({ description, onRetry }: ChangePasswordErrorStateProps) {
  return <ErrorState title="تعذر تحميل بيانات الحساب" description={description} onRetry={onRetry} />;
}
