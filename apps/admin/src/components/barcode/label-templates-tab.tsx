"use client";

import { LayoutTemplate, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteTemplateMutation, useTemplatesQuery } from "@/hooks/use-barcode";
import { usePermissions } from "@/hooks/use-permissions";
import type { LabelTemplate } from "@/types/barcode";
import { LABEL_SIZE_LABELS } from "./barcode-format";
import { TemplateFormDialog } from "./template-form-dialog";

export function LabelTemplatesTab() {
  const { can } = usePermissions();
  const canManage = can("barcode:manage");
  const { data, isLoading } = useTemplatesQuery({ page: 1, limit: 50 });
  const deleteMutation = useDeleteTemplateMutation();

  const [formTemplate, setFormTemplate] = useState<LabelTemplate | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<LabelTemplate | null>(null);

  const templates = data?.templates ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage && (
          <Button size="sm" onClick={() => { setFormTemplate(null); setFormOpen(true); }}>
            <Plus aria-hidden /> قالب جديد
          </Button>
        )}
      </div>

      <div className="rounded-xl border">
        {isLoading && !data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : templates.length === 0 ? (
          <EmptyState icon={LayoutTemplate} title="لا توجد قوالب" description="أنشئ أول قالب ملصق" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>المقاس</TableHead>
                  <TableHead>العناصر</TableHead>
                  <TableHead>افتراضي</TableHead>
                  <TableHead className="text-end">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => {
                  const elements = [
                    t.showBarcode && "باركود",
                    t.showQr && "QR",
                    t.showPrice && "سعر",
                    t.showName && "اسم",
                  ].filter(Boolean).join("، ");
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell className="text-sm">{LABEL_SIZE_LABELS[t.size]}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{elements}</TableCell>
                      <TableCell>{t.isDefault && <Badge variant="default">افتراضي</Badge>}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {canManage && (
                            <Button variant="ghost" size="icon-sm" title="تعديل" onClick={() => { setFormTemplate(t); setFormOpen(true); }}>
                              <Pencil aria-hidden />
                            </Button>
                          )}
                          {canManage && (
                            <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" title="حذف" onClick={() => setToDelete(t)}>
                              <Trash2 aria-hidden />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <TemplateFormDialog template={formTemplate} open={formOpen} onOpenChange={setFormOpen} />

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف القالب؟</AlertDialogTitle>
            <AlertDialogDescription>{toDelete?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deleteMutation.isPending} onClick={() => { if (toDelete) deleteMutation.mutate(toDelete.id, { onSuccess: () => setToDelete(null) }); }}>
              {deleteMutation.isPending && <Spinner className="text-destructive" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
