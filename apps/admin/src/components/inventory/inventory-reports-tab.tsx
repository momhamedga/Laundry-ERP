"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportDropdown } from "@/components/reports/export-dropdown";
import {
  fetchInventoryReport,
  fetchStockValueReport,
} from "@/services/inventory-reports.service";
import { formatCurrency } from "@/lib/format";
import { fmtQty } from "./inventory-format";

/**
 * تقارير المخزون - قيمة المخزون + جرد الأصناف، مع تصدير (CSV/Excel/PDF/طباعة)
 * عبر نفس محرك التصدير (Phase 5). تقارير الحركات/الموردين/المشتريات تُعرَض في
 * صفحاتها وتُصدَّر من هنا أيضاً.
 */
export function InventoryReportsTab() {
  const invQuery = useQuery({ queryKey: ["inv-report", "inventory"], queryFn: fetchInventoryReport });
  const svQuery = useQuery({ queryKey: ["inv-report", "stock-value"], queryFn: fetchStockValueReport });

  return (
    <div className="space-y-6">
      {/* تصدير كل التقارير */}
      <Card>
        <CardHeader>
          <CardTitle>تصدير التقارير</CardTitle>
          <CardDescription>CSV / Excel / PDF / طباعة عبر محرك التصدير الموحّد</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ExportDropdown type="inventory" filters={{ sortBy: "name", sortOrder: "asc" }} />
          <ExportDropdown type="inventory-stock-value" filters={{ sortBy: "quantity", sortOrder: "desc" }} />
          <ExportDropdown type="inventory-movements" filters={{ sortBy: "createdAt", sortOrder: "desc" }} />
          <ExportDropdown type="inventory-suppliers" filters={{ sortBy: "name", sortOrder: "asc" }} />
          <ExportDropdown type="inventory-purchases" filters={{ sortBy: "createdAt", sortOrder: "desc" }} />
        </CardContent>
      </Card>

      {/* قيمة المخزون */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>قيمة المخزون</CardTitle>
              <CardDescription>
                {svQuery.data
                  ? `الإجمالي: ${formatCurrency(svQuery.data.summary.totalValue)} — كميات: ${fmtQty(svQuery.data.summary.totalQuantity)}`
                  : "…"}
              </CardDescription>
            </div>
            <ExportDropdown type="inventory-stock-value" filters={{ sortBy: "quantity", sortOrder: "desc" }} />
          </div>
        </CardHeader>
        <CardContent>
          {svQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>الصنف</TableHead>
                    <TableHead className="text-end">الرصيد</TableHead>
                    <TableHead className="text-end">التكلفة</TableHead>
                    <TableHead className="text-end">القيمة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(svQuery.data?.items ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell dir="ltr" className="text-xs">{r.sku}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-end tabular-nums">{fmtQty(r.quantity)}</TableCell>
                      <TableCell className="text-end">{formatCurrency(r.costPrice)}</TableCell>
                      <TableCell className="text-end font-medium">{formatCurrency(r.stockValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* تقرير الأصناف */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>تقرير الأصناف</CardTitle>
              <CardDescription>
                {invQuery.data ? `${invQuery.data.summary.totalItems} صنف — كميات: ${fmtQty(invQuery.data.summary.totalQuantity)}` : "…"}
              </CardDescription>
            </div>
            <ExportDropdown type="inventory" filters={{ sortBy: "name", sortOrder: "asc" }} />
          </div>
        </CardHeader>
        <CardContent>
          {invQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>الصنف</TableHead>
                    <TableHead>المورّد</TableHead>
                    <TableHead className="text-end">الرصيد</TableHead>
                    <TableHead className="text-end">القيمة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invQuery.data?.items ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell dir="ltr" className="text-xs">{r.sku}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-sm">{r.supplierName ?? "—"}</TableCell>
                      <TableCell className="text-end tabular-nums">{fmtQty(r.quantity)}</TableCell>
                      <TableCell className="text-end">{formatCurrency(r.stockValue)}</TableCell>
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
