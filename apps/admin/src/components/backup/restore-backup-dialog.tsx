"use client";

import { AlertTriangle, FileJson, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useRestoreBackupMutation, useRestorePreviewMutation } from "@/hooks/use-backup";
import type { RestorePreview } from "@/types/backup";
import { formatBytes } from "./backup-format";

interface RestoreBackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACCEPT = ".json,.gz,application/json,application/octet-stream";
const MAX_BYTES = 50 * 1024 * 1024;

/**
 * حوار الاستعادة: رفع (Drag & Drop) → معاينة (Checksum/Version/Counts/تحذيرات)
 * → تأكيد صريح → استعادة فعلية. الاستعادة تحافظ على المصادقة (كلمات السر لا تُلمس).
 */
export function RestoreBackupDialog({ open, onOpenChange }: RestoreBackupDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const previewMutation = useRestorePreviewMutation();
  const restoreMutation = useRestoreBackupMutation();

  function resetState() {
    setFile(null);
    setPreview(null);
    setSizeError(null);
    previewMutation.reset();
    restoreMutation.reset();
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState();
    onOpenChange(next);
  }

  async function handleFile(selected: File) {
    setSizeError(null);
    setPreview(null);
    if (selected.size > MAX_BYTES) {
      setSizeError(`حجم الملف يتجاوز الحد الأقصى (${formatBytes(MAX_BYTES)})`);
      return;
    }
    if (selected.size === 0) {
      setSizeError("الملف فارغ");
      return;
    }
    setFile(selected);
    try {
      const result = await previewMutation.mutateAsync(selected);
      setPreview(result);
    } catch {
      // toast عبر onError
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) void handleFile(dropped);
  }

  async function handleRestore() {
    if (!file || !preview) return;
    try {
      await restoreMutation.mutateAsync({ file, expectedChecksum: preview.checksum });
      handleOpenChange(false);
    } catch {
      // toast عبر onError
    }
  }

  const previewing = previewMutation.isPending;
  const restoring = restoreMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>استعادة من نسخة احتياطية</DialogTitle>
          <DialogDescription>
            ارفع ملف نسخة (.json أو .json.gz). الاستعادة تعيد كتابة بيانات العمل مع الحفاظ على
            كلمات السر والجلسات.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            }`}
          >
            <UploadCloud aria-hidden className="size-8 text-muted-foreground" />
            <p className="text-sm">اسحب الملف هنا أو انقر للاختيار</p>
            {file && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" dir="ltr">
                <FileJson aria-hidden className="size-3.5" />
                {file.name} · {formatBytes(file.size)}
              </span>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) void handleFile(selected);
              }}
            />
          </div>

          {sizeError && (
            <p role="alert" className="text-sm text-destructive">
              {sizeError}
            </p>
          )}

          {previewing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" /> جارٍ فحص الملف…
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">صلاحية البنية</span>
                <span className={preview.valid ? "text-emerald-600" : "text-destructive"}>
                  {preview.valid ? "صالحة" : "غير صالحة"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">توافق الإصدار</span>
                <span className={preview.versionMatch ? "text-emerald-600" : "text-amber-600"}>
                  {preview.metadata?.applicationVersion ?? "غير معروف"} / {preview.currentVersion}
                </span>
              </div>
              <div className="text-xs text-muted-foreground" dir="ltr">
                sha256: {preview.checksum.slice(0, 16)}…
              </div>

              {preview.counts && (
                <div className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-3">
                  <Count label="فروع" value={preview.counts.branches} />
                  <Count label="مستخدمون" value={preview.counts.users} />
                  <Count label="عملاء" value={preview.counts.customers} />
                  <Count label="خدمات" value={preview.counts.services} />
                  <Count label="طلبات" value={preview.counts.orders} />
                  <Count label="مدفوعات" value={preview.counts.payments} />
                </div>
              )}

              {preview.warnings.length > 0 && (
                <ul className="space-y-1">
                  {preview.warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-amber-600">
                      <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={restoring}>
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleRestore()}
            disabled={!preview || !preview.valid || restoring || previewing}
          >
            {restoring && <Spinner className="text-destructive" />}
            تأكيد الاستعادة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded border px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
