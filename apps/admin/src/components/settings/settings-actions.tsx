"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface SettingsActionsProps {
  isDirty: boolean;
  isPending: boolean;
  onSave: () => void;
}

/** يعمل فقط إذا وُجدت تعديلات فعلية (isDirty) - لا يُعرض إطلاقاً بلا صلاحية settings:manage (يُتحكَّم بذلك من الأب) */
export function SettingsActions({ isDirty, isPending, onSave }: SettingsActionsProps) {
  return (
    <Button type="button" onClick={onSave} disabled={!isDirty || isPending}>
      {isPending && <Spinner className="text-primary-foreground" />}
      {!isPending && <Save aria-hidden />}
      حفظ التغييرات
    </Button>
  );
}
