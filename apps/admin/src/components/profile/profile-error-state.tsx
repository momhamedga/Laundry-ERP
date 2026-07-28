import { ErrorState } from "@/components/ui/error-state";

interface ProfileErrorStateProps {
  description?: string;
  onRetry: () => void;
}

/** خطأ تحميل الملف الشخصي - غلاف بعنوان ثابت فوق ErrorState الموحد */
export function ProfileErrorState({ description, onRetry }: ProfileErrorStateProps) {
  return (
    <ErrorState
      title="تعذر تحميل الملف الشخصي"
      description={description}
      onRetry={onRetry}
    />
  );
}
