import { ErrorState } from "@/components/ui/error-state";

interface SettingsErrorStateProps {
  description?: string;
  onRetry: () => void;
}

export function SettingsErrorState({ description, onRetry }: SettingsErrorStateProps) {
  return <ErrorState title="تعذر تحميل الإعدادات" description={description} onRetry={onRetry} />;
}
