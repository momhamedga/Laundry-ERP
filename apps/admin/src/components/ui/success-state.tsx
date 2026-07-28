import { CheckCircle2, type LucideIcon } from "lucide-react";

interface SuccessStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** حالة نجاح موحدة - مطابقة بصرياً لـ EmptyState/ErrorState */
export function SuccessState({ icon: Icon = CheckCircle2, title, description, action }: SuccessStateProps) {
  return (
    <div role="status" className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
        <Icon className="size-6" aria-hidden />
      </span>
      <div>
        <p className="font-medium text-success">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
