import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardProgressProps {
  steps: readonly string[];
  /** 1-based */
  currentStep: number;
}

/** مؤشر خطوات عام - قابل لإعادة الاستخدام لأي معالج متعدد الخطوات بالمشروع */
export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  return (
    <ol className="flex items-center gap-2" aria-label="خطوات إنشاء الطلب">
      {steps.map((label, index) => {
        const step = index + 1;
        const isDone = step < currentStep;
        const isCurrent = step === currentStep;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                isDone && "bg-primary text-primary-foreground",
                isCurrent && "border-2 border-primary text-primary",
                !isDone && !isCurrent && "bg-muted text-muted-foreground",
              )}
            >
              {isDone ? <Check className="size-3.5" aria-hidden /> : step}
            </span>
            <span
              className={cn(
                "text-xs whitespace-nowrap",
                isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {step < steps.length && <span className="h-px flex-1 bg-border" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
