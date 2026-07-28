"use client";

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
import { Spinner } from "@/components/ui/spinner";
import { useDeleteInvoiceMutation } from "@/hooks/use-invoices";
import type { InvoiceDetail, InvoiceListRow } from "@/types/invoice";

interface DeleteInvoiceDialogProps {
  invoice: InvoiceDetail | InvoiceListRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** حذف فعلي حقيقي (Hard Delete) - ممنوع بالخادم لفاتورة PAID (400)، الزر المُستدعي يتحقق من هذا مسبقاً */
export function DeleteInvoiceDialog({ invoice, open, onOpenChange }: DeleteInvoiceDialogProps) {
  const mutation = useDeleteInvoiceMutation();

  async function handleConfirm() {
    if (!invoice) return;
    try {
      await mutation.mutateAsync(invoice.id);
      onOpenChange(false);
    } catch {
      // toast بالفعل عبر onError - يبقى الحوار مفتوحاً لإعادة المحاولة
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>حذف الفاتورة؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم حذف الفاتورة &quot;{invoice?.invoiceNumber}&quot; نهائياً. هذا الإجراء لا يمكن التراجع
            عنه.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner className="text-destructive" />}
            حذف
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
