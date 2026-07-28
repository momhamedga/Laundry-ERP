import { Construction } from "lucide-react";
import { PageHeader } from "./page-header";

/** عنصر نائب موحد للصفحات التي تُبنى في المراحل القادمة */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-center">
        <Construction className="size-10 text-muted-foreground/60" aria-hidden />
        <p className="font-medium text-muted-foreground">
          هذه الصفحة تُبنى في المرحلة القادمة
        </p>
      </div>
    </div>
  );
}
