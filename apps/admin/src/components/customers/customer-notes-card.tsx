"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateCustomerNotesMutation } from "@/hooks/use-customers";
import { usePermissions } from "@/hooks/use-permissions";

interface CustomerNotesCardProps {
  customerId: string;
  notes: string | null;
}

/** ملاحظات العميل - قابلة للتعديل لمن يملك صلاحية customers:manage */
export function CustomerNotesCard({ customerId, notes }: CustomerNotesCardProps) {
  const { can } = usePermissions();
  const canEdit = can("customers:manage");
  const mutation = useUpdateCustomerNotesMutation(customerId);

  const [value, setValue] = useState(notes ?? "");
  // مزامنة مع تحديثات الخادم بدون Effect ("تعديل الحالة أثناء الرسم")
  const [loadedNotes, setLoadedNotes] = useState(notes);
  if (notes !== loadedNotes) {
    setLoadedNotes(notes);
    setValue(notes ?? "");
  }

  const dirty = value !== (notes ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ملاحظات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={canEdit ? "أضف ملاحظة عن هذا العميل..." : "لا توجد ملاحظات"}
          rows={5}
          disabled={!canEdit}
        />
        {canEdit && (
          <Button
            size="sm"
            onClick={() => mutation.mutate(value.trim() || null)}
            disabled={!dirty || mutation.isPending}
          >
            {mutation.isPending ? (
              <Spinner className="text-primary-foreground" />
            ) : (
              <Save aria-hidden />
            )}
            حفظ الملاحظات
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
