"use client";

import { Check, X } from "lucide-react";
import { PASSWORD_REQUIREMENTS } from "@/lib/validations/change-password";
import { cn } from "@/lib/utils";

interface PasswordRequirementsProps {
  password: string;
  id?: string;
}

/** قائمة تحقق حية بقواعد الخادم الإلزامية فقط (طول+حروف+رقم) - لا حرف خاص إلزامي */
export function PasswordRequirements({ password, id }: PasswordRequirementsProps) {
  return (
    <ul id={id} className="space-y-1 text-xs" aria-live="polite">
      {PASSWORD_REQUIREMENTS.map((req) => {
        const met = req.test(password);
        return (
          <li
            key={req.id}
            className={cn("flex items-center gap-1.5", met ? "text-success" : "text-muted-foreground")}
          >
            {met ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
            {req.label}
          </li>
        );
      })}
    </ul>
  );
}
