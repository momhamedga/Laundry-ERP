import { ErrorState } from "@/components/ui/error-state";
import { getErrorMessage } from "@/lib/axios";

interface InvoiceErrorStateProps {
  error: unknown;
  onRetry: () => void;
}

/** غلاف رقيق حول ErrorState العام - رسالة الخطأ الحقيقية من الخادم (401/403/404/...) عبر getErrorMessage */
export function InvoiceErrorState({ error, onRetry }: InvoiceErrorStateProps) {
  return (
    <div className="p-2">
      <ErrorState description={getErrorMessage(error)} onRetry={onRetry} />
    </div>
  );
}
