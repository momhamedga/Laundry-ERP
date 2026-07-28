"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportDropdown } from "@/components/reports/export-dropdown";
import type { ApiListResponse } from "@/types";

interface MostScannedRow {
  itemId: string | null;
  name: string;
  sku: string;
  barcode: string | null;
  scanCount: number;
}
interface MissingRow {
  id: string;
  sku: string;
  name: string;
  type: string;
  quantity: number;
}

async function fetchMostScanned() {
  const { data } = await apiClient.get<ApiListResponse<{ items: MostScannedRow[] }>>(
    "/reports/barcode-most-scanned",
    { params: { limit: 20 } },
  );
  return data.data.items;
}
async function fetchMissing() {
  const { data } = await apiClient.get<ApiListResponse<{ items: MissingRow[] }>>(
    "/reports/barcode-missing",
    { params: { limit: 20 } },
  );
  return data.data.items;
}

export function BarcodeReportsTab() {
  const mostScanned = useQuery({ queryKey: ["bc-report", "most-scanned"], queryFn: fetchMostScanned });
  const missing = useQuery({ queryKey: ["bc-report", "missing"], queryFn: fetchMissing });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>تصدير التقارير</CardTitle>
          <CardDescription>CSV / Excel / PDF / طباعة عبر محرك التصدير الموحّد</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ExportDropdown type="barcode-most-scanned" filters={{}} />
          <ExportDropdown type="barcode-print-history" filters={{}} />
          <ExportDropdown type="barcode-missing" filters={{}} />
          <ExportDropdown type="barcode-invalid" filters={{}} />
          <ExportDropdown type="barcode-unused" filters={{}} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>الأكثر مسحاً</CardTitle>
              <CardDescription>ترتيب الأصناف حسب عدد عمليات المسح الناجحة</CardDescription>
            </div>
            <ExportDropdown type="barcode-most-scanned" filters={{}} />
          </div>
        </CardHeader>
        <CardContent>
          {mostScanned.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (mostScanned.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد عمليات مسح بعد</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>الصنف</TableHead>
                    <TableHead>الباركود</TableHead>
                    <TableHead className="text-end">عدد المسح</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(mostScanned.data ?? []).map((r) => (
                    <TableRow key={r.itemId ?? r.sku}>
                      <TableCell dir="ltr" className="text-xs">{r.sku}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell dir="ltr" className="font-mono text-xs">{r.barcode ?? "—"}</TableCell>
                      <TableCell className="text-end tabular-nums font-medium">{r.scanCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>أصناف بلا باركود</CardTitle>
              <CardDescription>أصناف نشطة تحتاج توليد باركود</CardDescription>
            </div>
            <ExportDropdown type="barcode-missing" filters={{}} />
          </div>
        </CardHeader>
        <CardContent>
          {missing.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (missing.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">كل الأصناف لها باركود ✓</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>الصنف</TableHead>
                    <TableHead className="text-end">الرصيد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(missing.data ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell dir="ltr" className="text-xs">{r.sku}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-end tabular-nums">{r.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
