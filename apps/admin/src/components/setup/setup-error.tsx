"use client";

import { CircleAlert } from "lucide-react";

interface SetupErrorProps {
  title: string;
  description: string;
}

/**
 * خطأ خطوة في المعالج.
 *
 * يُعرَض داخل الخطوة لا كـtoast عابر: المستخدم هنا في منتصف عمل ويحتاج السبب
 * باقياً أمامه بينما يصحّح المدخلات. (الـtoast يظهر أيضاً من طفرات الخطّافات
 * القائمة — لم نعطّله كي لا نغيّر سلوكاً قائماً، وهذا يبقيه بعد اختفائه.)
 */
export function SetupError({ title, description }: SetupErrorProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <strong className="font-medium">{title}</strong>
        <span className="block text-xs opacity-90">{description}</span>
      </span>
    </div>
  );
}
