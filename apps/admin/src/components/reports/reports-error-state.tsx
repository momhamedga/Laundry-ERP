import { ErrorState } from "@/components/ui/error-state";
import { getErrorMessage } from "@/lib/axios";

interface ReportsErrorStateProps {
  error: unknown;
  onRetry: () => void;
}

/** غلاف رقيق حول ErrorState العام - رسالة الخطأ الحقيقية من الخادم (401/403/غيرها) عبر getErrorMessage */
export function ReportsErrorState({ error, onRetry }: ReportsErrorStateProps) {
  return (
    <div className="p-2">
      <ErrorState description={getErrorMessage(error)} onRetry={onRetry} />
    </div>
  );
}
