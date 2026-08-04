"use client";

import { useEffect, useState } from "react";
import { LICENSE_BLOCKED_EVENT } from "@/lib/license-gate";
import { LicenseBlockedDialog } from "./license-gate";

/**
 * مستمع عالمي واحد لحوار منع الترخيص (Phase 15B).
 *
 * يُركَّب مرّة واحدة في تخطيط اللوحة، فيلتقط أي محاولة إنشاء مرفوضة من أي شاشة
 * دون أن تعرف الشاشة شيئاً عن الترخيص.
 */
export function LicenseBlockedListener() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onBlocked = (): void => setOpen(true);
    window.addEventListener(LICENSE_BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(LICENSE_BLOCKED_EVENT, onBlocked);
  }, []);

  return <LicenseBlockedDialog open={open} onOpenChange={setOpen} />;
}
