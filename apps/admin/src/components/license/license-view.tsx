"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Copy,
  Download,
  FileKey,
  Monitor,
  RefreshCw,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  desktopBridge,
  limitLabel,
  LICENSE_REASON_LABEL,
  LICENSE_TYPE_LABEL,
  type DesktopLicenseStatus,
} from "@/lib/desktop";
import { invalidateLicenseCache } from "@/lib/license-gate";

/** أسماء المزايا بالعربية (المفاتيح من @laundry/license-sdk) */
const FEATURE_LABEL: Record<string, string> = {
  pos: "نقطة البيع",
  reports: "التقارير",
  reports_advanced: "التقارير المتقدّمة",
  inventory: "المخزون",
  backup: "النسخ الاحتياطي",
  offline_sync: "المزامنة دون إنترنت",
  multi_branch: "تعدّد الفروع",
  hr: "الموارد البشرية",
  loyalty: "الولاء",
  api_access: "الوصول البرمجي",
};

/** صفحة الترخيص (Phase 15B) — عرض الحالة وتفعيل المنتج دون إنترنت. */
export function LicenseView() {
  // ترخيص مُستورَد حديثاً يتجاوز نتيجة الاستعلام حتى إعادة الجلب التالية
  const [imported, setImported] = useState<DesktopLicenseStatus | null>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const bridge = desktopBridge();

  // خارج Electron لا يوجد جسر، فالاستعلام مُعطَّل ولا يبقى في حالة تحميل أبدية
  const query = useQuery({
    queryKey: ["license", "status"],
    enabled: bridge !== null,
    staleTime: 60_000,
    queryFn: async () => {
      const b = desktopBridge();
      if (!b) throw new Error("الجسر غير متاح");
      const [status, machineId] = await Promise.all([b.license.status(), b.license.machineId()]);
      return { status, machineId };
    },
  });

  const refresh = () => void query.refetch();
  const loading = bridge !== null && query.isPending;
  const status = imported ?? query.data?.status ?? null;
  const machineId = query.data?.machineId ?? null;

  const onExport = async () => {
    if (!bridge) return;
    setBusy("export");
    try {
      const p = await bridge.license.exportRequest();
      setToast(p ? { kind: "ok", text: `حُفظ طلب التفعيل في: ${p}` } : null);
    } catch (err) {
      setToast({ kind: "err", text: err instanceof Error ? err.message : "تعذّر تصدير الطلب" });
    } finally {
      setBusy(null);
    }
  };

  const onImport = async () => {
    if (!bridge) return;
    setBusy("import");
    try {
      const res = await bridge.license.import();
      if (res === null) {
        setToast(null); // أُلغي اختيار الملفّ
      } else if (res.valid) {
        setImported(res);
        invalidateLicenseCache(); // يرفع المنع فوراً بلا انتظار انتهاء الكاش
        void query.refetch();
        setToast({ kind: "ok", text: "تم تفعيل الترخيص بنجاح" });
      } else {
        setToast({
          kind: "err",
          text: res.message ?? LICENSE_REASON_LABEL[res.reason ?? ""] ?? "الترخيص مرفوض",
        });
      }
    } catch (err) {
      setToast({ kind: "err", text: err instanceof Error ? err.message : "تعذّر استيراد الترخيص" });
    } finally {
      setBusy(null);
    }
  };

  const onCopyId = async () => {
    if (!machineId) return;
    await navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // خارج Electron لا يوجد ترخيص أصلاً — لا نعرض واجهة مضلّلة
  if (!bridge && !loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="الترخيص" description="حالة ترخيص المنتج وتفعيله" />
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
            <Monitor className="size-5 shrink-0" aria-hidden />
            <p>
              إدارة الترخيص متاحة داخل تطبيق سطح المكتب فقط. افتح النظام من تطبيق
              «Laundry ERP» المثبَّت على الجهاز.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="الترخيص" description="حالة ترخيص المنتج وتفعيله" />
        <Card>
          <CardContent className="flex items-center gap-3 py-8">
            <Spinner className="size-4" /> جارٍ قراءة حالة الترخيص…
          </CardContent>
        </Card>
      </div>
    );
  }

  const queryError = query.isError ? (query.error instanceof Error ? query.error.message : "تعذّر قراءة حالة الترخيص") : null;
  const p = status?.payload;
  const valid = status?.valid === true;
  const inGrace = status?.inGrace === true;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الترخيص"
        description="حالة ترخيص المنتج وتفعيله — يعمل دون إنترنت بالكامل"
        actions={
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw aria-hidden /> تحديث
          </Button>
        }
      />

      {queryError && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {queryError}
        </div>
      )}

      {toast && (
        <div
          role="status"
          className={`rounded-md border px-4 py-3 text-sm ${
            toast.kind === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* ==================== الحالة ==================== */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            {valid ? (
              <BadgeCheck className="size-5 text-emerald-600" aria-hidden />
            ) : inGrace ? (
              <AlertTriangle className="size-5 text-amber-600" aria-hidden />
            ) : (
              <ShieldAlert className="size-5 text-destructive" aria-hidden />
            )}
            حالة الترخيص
          </CardTitle>
          <Badge variant={valid ? "default" : inGrace ? "secondary" : "destructive"}>
            {valid ? "مُفعَّل" : inGrace ? "فترة سماح" : "غير مُفعَّل"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {!valid && (
            <div
              className={`rounded-md border px-4 py-3 text-sm ${
                inGrace
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              <p className="font-medium">
                {status?.message ?? LICENSE_REASON_LABEL[status?.reason ?? ""] ?? "الترخيص غير صالح"}
              </p>
              {inGrace ? (
                <p className="mt-1">
                  النظام يعمل كاملاً خلال فترة السماح — متبقٍّ{" "}
                  <strong>{status?.graceDaysRemaining}</strong> يوماً. فعّل الترخيص قبل انتهائها.
                </p>
              ) : (
                <p className="mt-1">
                  انتهت فترة السماح: تسجيل الطلبات والمدفوعات موقوف. الاطّلاع على البيانات
                  وتصديرها وأخذ نسخة احتياطية ما زال متاحاً.
                </p>
              )}
            </div>
          )}

          {valid && p && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="العميل" value={p.customerName} />
              <Field label="الشركة" value={p.companyName} />
              <Field label="النوع" value={LICENSE_TYPE_LABEL[p.type] ?? p.type} />
              <Field
                label="تاريخ الانتهاء"
                value={
                  p.expiryDate
                    ? `${p.expiryDate.slice(0, 10)} (متبقٍّ ${status?.daysRemaining} يوماً)`
                    : "ترخيص دائم"
                }
              />
              <Field label="عدد المستخدمين" value={limitLabel(p.maxUsers)} />
              <Field label="عدد الفروع" value={limitLabel(p.maxBranches)} />
              <Field label="عدد الأجهزة" value={limitLabel(p.maxDevices)} />
              <Field label="تطابق الجهاز" value={`${status?.machineScore ?? 0} من 5`} />
              <Field label="رقم الترخيص" value={p.licenseId} mono />
            </div>
          )}

          {valid && p && p.features.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">المزايا المُفعَّلة</p>
                <div className="flex flex-wrap gap-2">
                  {p.features.map((f) => (
                    <Badge key={f} variant="secondary">
                      {FEATURE_LABEL[f] ?? f}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ==================== التفعيل ==================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileKey className="size-5" aria-hidden /> تفعيل المنتج
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">معرّف هذا الجهاز</p>
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-3 py-2 font-mono text-base tracking-wider">
                {machineId ?? "—"}
              </code>
              <Button variant="outline" size="sm" onClick={() => void onCopyId()}>
                <Copy aria-hidden /> {copied ? "نُسخ" : "نسخ"}
              </Button>
            </div>
          </div>

          <Separator />

          <ol className="space-y-3 text-sm">
            <Step n={1}>
              اضغط <strong>تصدير طلب التفعيل</strong> واحفظ الملفّ.
            </Step>
            <Step n={2}>أرسل الملفّ إلى مورّد النظام (بريد إلكتروني أو أي وسيلة).</Step>
            <Step n={3}>
              ستستلم ملفّ ترخيص باسم <code className="rounded bg-muted px-1">‎.license</code>.
            </Step>
            <Step n={4}>
              اضغط <strong>استيراد ملفّ الترخيص</strong> واختر الملفّ المُستلَم — يعمل التفعيل
              فوراً دون اتصال بالإنترنت.
            </Step>
          </ol>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void onExport()} disabled={busy !== null}>
              {busy === "export" ? <Spinner className="size-3.5" /> : <Download aria-hidden />}
              تصدير طلب التفعيل
            </Button>
            <Button onClick={() => void onImport()} disabled={busy !== null}>
              {busy === "import" ? <Spinner className="size-3.5" /> : <Upload aria-hidden />}
              استيراد ملفّ الترخيص
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            معرّف الجهاز مُشتقّ من بصمة مُهشَّمة للعتاد — لا يحتوي أي رقم تسلسلي خام، ولا يُرسل
            أي شيء تلقائياً إلى أي خادم.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}
