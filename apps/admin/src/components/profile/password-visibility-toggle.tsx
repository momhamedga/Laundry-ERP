"use client";

import { Eye, EyeOff } from "lucide-react";

interface PasswordVisibilityToggleProps {
  visible: boolean;
  onToggle: () => void;
  /** اسم الحقل بالعربية لبناء aria-label ديناميكي ("إظهار/إخفاء كلمة السر الحالية") */
  label: string;
}

/** زر إظهار/إخفاء كلمة سر - يُموضَع داخل حقل نسبي (relative) بموضع منطقي end-2 */
export function PasswordVisibilityToggle({ visible, onToggle, label }: PasswordVisibilityToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? `إخفاء ${label}` : `إظهار ${label}`}
      className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
    >
      {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
    </button>
  );
}
