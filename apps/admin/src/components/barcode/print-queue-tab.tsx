"use client";

import { Printer, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTemplatesQuery, usePrintMutation } from "@/hooks/use-barcode";
import { useSettingsQuery } from "@/hooks/use-settings";
import { usePrintQueueStore } from "@/store/print-queue-store";
import type { LabelSize } from "@/types/barcode";
import { LABEL_SIZE_LABELS } from "./barcode-format";
import { LabelPreview, templateToConfig } from "./label-preview";

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #barcode-print-area, #barcode-print-area * { visibility: visible !important; }
  #barcode-print-area { position: absolute !important; inset: 0 !important; width: 100%; }
}
`;

export function PrintQueueTab() {
  const items = usePrintQueueStore((s) => s.items);
  const setQuantity = usePrintQueueStore((s) => s.setQuantity);
  const remove = usePrintQueueStore((s) => s.remove);
  const clear = usePrintQueueStore((s) => s.clear);

  const { data: templatesData } = useTemplatesQuery({ limit: 100 });
  const { data: settings } = useSettingsQuery();
  const printMutation = usePrintMutation();

  const [templateId, setTemplateId] = useState<string>("none");
  const [size, setSize] = useState<LabelSize>("A4");

  const companyName = settings?.general.companyName ?? "Laundry ERP";
  const template = templatesData?.templates.find((t) => t.id === templateId) ?? null;
  const config = templateToConfig(template);

  // توسيع الطابور حسب الكمية للطباعة
  const expanded = items.flatMap((it) => Array.from({ length: it.quantity }, () => it));

  function handlePrint() {
    if (items.length === 0) return;
    // سجّل الطباعة بالخادم أولاً (لا يمنع الطباعة إن فشل)
    printMutation.mutate({
      items: items.map((i) => ({ itemId: i.itemId, quantity: i.quantity })),
      size,
      templateId: template?.id,
    });
    // نافذة الطباعة بالمتصفح - الملصقات مرسومة أصلاً بالـDOM
    setTimeout(() => window.print(), 100);
  }

  return (
    <>
      <style>{PRINT_CSS}</style>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>طابور الطباعة</CardTitle>
                <CardDescription>{items.length} صنف — {expanded.length} ملصق</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs">القالب</Label>
                  <Select value={templateId} onValueChange={(v) => v && setTemplateId(v)}>
                    <SelectTrigger size="sm" className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">افتراضي</SelectItem>
                      {(templatesData?.templates ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Select value={size} onValueChange={(v) => v && setSize(v as LabelSize)}>
                  <SelectTrigger size="sm" className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LABEL_SIZE_LABELS) as LabelSize[]).map((s) => (
                      <SelectItem key={s} value={s}>{LABEL_SIZE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {items.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clear}>
                    <Trash2 aria-hidden /> إفراغ
                  </Button>
                )}
                <Button size="sm" disabled={items.length === 0} onClick={handlePrint}>
                  <Printer aria-hidden /> طباعة
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <EmptyState icon={Printer} title="الطابور فارغ" description="أضف أصنافاً من مركز الباركود" />
            ) : (
              <div className="space-y-4">
                {/* محرّرات الكمية */}
                <div className="space-y-2">
                  {items.map((it) => (
                    <div key={it.itemId} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{it.name}</p>
                        <p dir="ltr" className="truncate text-xs text-muted-foreground">{it.sku} · {it.barcode}</p>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        className="h-8 w-20 text-center"
                        value={it.quantity}
                        onChange={(e) => setQuantity(it.itemId, Number(e.target.value) || 1)}
                      />
                      <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => remove(it.itemId)}>
                        <X aria-hidden />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* معاينة */}
                <div>
                  <p className="mb-2 text-sm font-medium">معاينة</p>
                  <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-3">
                    {items.slice(0, 8).map((it) => (
                      <div key={it.itemId} className="w-40">
                        <LabelPreview item={it} config={config} companyName={companyName} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* منطقة الطباعة (مخفية على الشاشة، تظهر عند الطباعة فقط) */}
      <div id="barcode-print-area" style={{ position: "fixed", left: "-10000px", top: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4mm", padding: "4mm" }}>
          {expanded.map((it, i) => (
            <div key={i} style={{ width: "50mm" }}>
              <LabelPreview item={it} config={config} companyName={companyName} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
