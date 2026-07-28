import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  /** نص لقارئات الشاشة */
  label?: string;
}

export function Spinner({ className, label = "جارٍ التحميل" }: SpinnerProps) {
  return (
    <span role="status" aria-label={label}>
      <Loader2 className={cn("size-5 animate-spin text-primary", className)} />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** شاشة تحميل كاملة - تُستخدم في الـ Guards وloading.tsx */
export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Spinner className="size-8" label={label} />
    </div>
  );
}
