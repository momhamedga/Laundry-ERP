"use client";

import { Camera, CameraOff, CheckCircle2, ScanLine, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScanMutation } from "@/hooks/use-barcode";
import { fmtQty } from "@/components/inventory/inventory-format";
import type { ScanAction, ScanResult } from "@/types/barcode";
import { SCAN_ACTION_LABELS } from "./barcode-format";

/** واجهة مبسّطة لـ BarcodeDetector الأصلية بالمتصفح (Chromium) - بلا مكتبة كاميرا */
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

export function ScannerTab() {
  const scanMutation = useScanMutation();
  const [action, setAction] = useState<ScanAction>("LOOKUP");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [recent, setRecent] = useState<{ code: string; found: boolean }[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const cameraSupported = typeof window !== "undefined" && "BarcodeDetector" in window;

  async function doScan(value: string) {
    const v = value.trim();
    if (!v) return;
    // منع تكرار نفس المسح خلال ثانيتين (الكاميرا تُطلق متتالياً)
    const now = Date.now();
    if (lastScanRef.current.code === v && now - lastScanRef.current.at < 2000) return;
    lastScanRef.current = { code: v, at: now };

    try {
      const r = await scanMutation.mutateAsync({ code: v, action });
      setResult(r);
      setRecent((prev) => [{ code: v, found: r.found }, ...prev].slice(0, 8));
    } catch {
      // toast عبر onError
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function startCamera() {
    setCameraError(null);
    if (!cameraSupported) {
      setCameraError("متصفحك لا يدعم مسح الكاميرا (BarcodeDetector) - استخدم قارئ USB أو Chrome/Edge");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);

      const Ctor = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
      const detector = new Ctor({
        formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "qr_code"],
      });

      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0 && codes[0]) await doScan(codes[0].rawValue);
        } catch {
          // إطار غير قابل للفحص - تجاهل
        }
        rafRef.current = requestAnimationFrame(() => void tick());
      };
      rafRef.current = requestAnimationFrame(() => void tick());
    } catch {
      setCameraError("تعذّر الوصول للكاميرا - تحقّق من الأذونات");
      setCameraOn(false);
    }
  }

  // تنظيف الكاميرا عند مغادرة التبويب
  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* الإدخال */}
      <Card>
        <CardHeader>
          <CardTitle>الماسح</CardTitle>
          <CardDescription>قارئ USB/لوحة مفاتيح (اكتب/امسح ثم Enter) أو كاميرا</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>الإجراء عند المسح</Label>
            <Select value={action} onValueChange={(v) => v && setAction(v as ScanAction)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(SCAN_ACTION_LABELS) as ScanAction[]).map((a) => (
                  <SelectItem key={a} value={a}>{SCAN_ACTION_LABELS[a]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void doScan(code);
              setCode("");
            }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              autoFocus
              dir="ltr"
              placeholder="امسح أو اكتب الكود…"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button type="submit" disabled={scanMutation.isPending}>
              <ScanLine aria-hidden /> مسح
            </Button>
          </form>

          <div className="flex items-center gap-2">
            {!cameraOn ? (
              <Button variant="outline" size="sm" onClick={() => void startCamera()}>
                <Camera aria-hidden /> تشغيل الكاميرا
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={stopCamera}>
                <CameraOff aria-hidden /> إيقاف الكاميرا
              </Button>
            )}
            {!cameraSupported && <span className="text-xs text-muted-foreground">الكاميرا غير مدعومة بهذا المتصفح</span>}
          </div>
          {cameraError && <p className="text-sm text-destructive">{cameraError}</p>}
          <video ref={videoRef} className={cameraOn ? "w-full rounded-lg border" : "hidden"} muted playsInline />
        </CardContent>
      </Card>

      {/* النتيجة */}
      <Card>
        <CardHeader>
          <CardTitle>النتيجة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result ? (
            <p className="text-sm text-muted-foreground">امسح كوداً لعرض الصنف</p>
          ) : result.found && result.item ? (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 aria-hidden className="size-5 text-emerald-500" />
                <span className="font-medium">{result.item.name}</span>
                {result.lowStock && <Badge variant="secondary">نقص مخزون</Badge>}
              </div>
              <p dir="ltr" className="text-sm text-muted-foreground">{result.item.sku} · {result.item.barcode}</p>
              <p className="text-sm">الرصيد: <b>{fmtQty(result.item.quantity)}</b></p>
              <Link
                href="/inventory"
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-border px-2.5 text-[0.8rem] font-medium hover:bg-muted"
              >
                فتح المخزون
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 p-3 text-destructive">
              <XCircle aria-hidden className="size-5" />
              <span>لا يوجد صنف مطابق لهذا الكود</span>
            </div>
          )}

          {recent.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">آخر عمليات المسح</p>
              <ul className="space-y-1">
                {recent.map((r, i) => (
                  <li key={i} className="flex items-center justify-between rounded border px-2 py-1 text-xs">
                    <span dir="ltr" className="font-mono">{r.code}</span>
                    {r.found ? (
                      <Badge variant="default">مطابق</Badge>
                    ) : (
                      <Badge variant="destructive">غير مطابق</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
