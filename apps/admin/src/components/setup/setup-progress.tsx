"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SetupStepMeta {
  key: string;
  title: string;
}

interface SetupProgressProps {
  steps: readonly SetupStepMeta[];
  /** فهرس الخطوة الحالية (يبدأ من صفر) */
  current: number;
}

/**
 * مؤشّر تقدّم المعالج.
 *
 * قائمة مرقّمة دلالياً (ol) لا صفّ divs: قارئ الشاشة يعلن «خطوة 2 من 4» بلا
 * نصّ إضافي، ويبقى الترتيب مفهوماً إن تعطّل التنسيق. وaria-current يعلن الخطوة
 * الجارية دون الاعتماد على اللون وحده.
 */
export function SetupProgress({ steps, current }: SetupProgressProps) {
  return (
    <nav aria-label="خطوات التهيئة">
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={step.key} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary text-primary",
                  !done && !active && "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
                <span className="sr-only">
                  {done ? "مكتملة: " : active ? "الحالية: " : "لاحقة: "}
                </span>
              </span>
              <span
                className={cn(
                  "hidden truncate text-xs sm:inline",
                  active ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "h-px min-w-3 flex-1 transition-colors",
                    done ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        الخطوة {current + 1} من {steps.length}: {steps[current]?.title}
      </p>
    </nav>
  );
}
