"use client";

import {
  computePasswordStrength,
  PASSWORD_STRENGTH_LABELS,
  type PasswordStrengthLevel,
} from "@/lib/validations/change-password";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
}

const BAR_CLASSES: Record<PasswordStrengthLevel, string> = {
  empty: "w-0 bg-muted",
  weak: "w-1/3 bg-destructive",
  medium: "w-2/3 bg-warning",
  strong: "w-full bg-success",
};

const TEXT_CLASSES: Record<PasswordStrengthLevel, string> = {
  empty: "",
  weak: "text-destructive",
  medium: "text-warning-foreground dark:text-warning",
  strong: "text-success",
};

/** مؤشر قوة كلمة السر - بلا مكتبة خارجية، محسوب من computePasswordStrength */
export function PasswordStrength({ password }: PasswordStrengthProps) {
  const level = computePasswordStrength(password);
  if (level === "empty") return null;

  return (
    <div className="space-y-1" aria-live="polite">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", BAR_CLASSES[level])} />
      </div>
      <p className={cn("text-xs font-medium", TEXT_CLASSES[level])}>
        قوة كلمة السر: {PASSWORD_STRENGTH_LABELS[level]}
      </p>
    </div>
  );
}
