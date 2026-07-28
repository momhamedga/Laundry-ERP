"use client";

import { AlertTriangle, FileText, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateDocumentMutation,
  useDeleteDocumentMutation,
  useDocumentsQuery,
  useExpiringDocumentsQuery,
} from "@/hooks/use-hr";
import { usePermissions } from "@/hooks/use-permissions";
import { formatDate } from "@/lib/format";
import type { CreateDocumentInput } from "@/types/hr";
import { EmployeeSelect } from "./employee-select";

const DOC_TYPE_LABELS: Record<CreateDocumentInput["type"], string> = {
  CONTRACT: "عقد",
  ID_CARD: "هوية",
  PASSPORT: "جواز سفر",
  CERTIFICATE: "شهادة",
  OTHER: "أخرى",
};

export function DocumentsTab() {
  const { can } = usePermissions();
  const canManage = can("employees:manage");
  const expiring = useExpiringDocumentsQuery(30);
  const [employeeId, setEmployeeId] = useState("");
  const docs = useDocumentsQuery(employeeId || null);
  const del = useDeleteDocumentMutation();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* تنبيهات انتهاء الوثائق */}
      {expiring.data && expiring.data.length > 0 && (
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-warning">
              <AlertTriangle className="size-4" aria-hidden />
              مستندات قاربت على الانتهاء ({expiring.data.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {expiring.data.slice(0, 8).map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2">
                <span>
                  {d.employeeName ?? ""} — {DOC_TYPE_LABELS[d.type]}: {d.name}
                </span>
                <Badge variant={d.expired ? "destructive" : "outline"}>
                  {d.expired ? "منتهٍ" : `ينتهي ${formatDate(d.expiryDate)}`}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <EmployeeSelect value={employeeId} onChange={setEmployeeId} placeholder="اختر موظفاً لعرض مستنداته" />
        {canManage && employeeId && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus aria-hidden />
            مستند
          </Button>
        )}
      </div>

      {employeeId && docs.data && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>النوع</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الرقم</TableHead>
                  <TableHead>الانتهاء</TableHead>
                  {canManage && <TableHead className="text-end">حذف</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5 : 4} className="text-center text-muted-foreground">
                      لا مستندات لهذا الموظف
                    </TableCell>
                  </TableRow>
                ) : (
                  docs.data.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{DOC_TYPE_LABELS[d.type]}</TableCell>
                      <TableCell className="font-medium">
                        {d.url ? (
                          <a href={d.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            {d.name}
                          </a>
                        ) : (
                          d.name
                        )}
                      </TableCell>
                      <TableCell dir="ltr" className="text-xs">{d.number ?? "—"}</TableCell>
                      <TableCell>
                        {d.expiryDate ? (
                          <Badge variant={d.expired ? "destructive" : d.expiringSoon ? "outline" : "secondary"}>
                            {formatDate(d.expiryDate)}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-end">
                          <Button size="icon" variant="ghost" aria-label="حذف" disabled={del.isPending} onClick={() => del.mutate(d.id)}>
                            <Trash2 aria-hidden />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!employeeId && (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
          <FileText className="size-8" aria-hidden />
          <p>اختر موظفاً لعرض وإدارة مستنداته</p>
        </div>
      )}

      <AddDocumentDialog employeeId={employeeId} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function AddDocumentDialog({
  employeeId,
  open,
  onOpenChange,
}: {
  employeeId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const mutation = useCreateDocumentMutation();
  const [type, setType] = useState<CreateDocumentInput["type"]>("ID_CARD");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [url, setUrl] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [prev, setPrev] = useState(false);
  if (open !== prev) {
    setPrev(open);
    if (open) {
      setType("ID_CARD");
      setName("");
      setNumber("");
      setUrl("");
      setExpiryDate("");
    }
  }

  async function submit() {
    if (!name.trim() || !employeeId) return;
    try {
      await mutation.mutateAsync({
        employeeProfileId: employeeId,
        input: {
          type,
          name: name.trim(),
          number: number.trim() || undefined,
          url: url.trim() || undefined,
          expiryDate: expiryDate || undefined,
        },
      });
      onOpenChange(false);
    } catch {
      /* toast */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة مستند</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>النوع</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as CreateDocumentInput["type"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOC_TYPE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>الاسم *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>الرقم</Label>
              <Input value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ الانتهاء</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>رابط (اختياري)</Label>
            <Input dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button onClick={() => void submit()} disabled={mutation.isPending || !name.trim()}>
            {mutation.isPending && <Spinner className="text-primary-foreground" />}
            إضافة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
