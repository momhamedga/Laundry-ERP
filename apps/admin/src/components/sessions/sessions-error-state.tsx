import { ErrorState } from "@/components/ui/error-state";

interface SessionsErrorStateProps {
  description?: string;
  onRetry: () => void;
}

export function SessionsErrorState({ description, onRetry }: SessionsErrorStateProps) {
  return <ErrorState title="تعذر تحميل الجلسات النشطة" description={description} onRetry={onRetry} />;
}
