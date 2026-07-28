import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";

interface WizardFooterProps {
  onCancel: () => void;
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}

/** تذييل عام لأي معالج متعدد الخطوات - إلغاء/رجوع/التالي */
export function WizardFooter({
  onCancel,
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "التالي",
}: WizardFooterProps) {
  return (
    <SheetFooter className="flex-row items-center justify-between border-t">
      <Button variant="ghost" onClick={onCancel}>
        إلغاء
      </Button>
      <div className="flex gap-2">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            <ArrowRight aria-hidden /> رجوع
          </Button>
        )}
        {onNext && (
          <Button onClick={onNext} disabled={nextDisabled}>
            {nextLabel} <ArrowLeft aria-hidden />
          </Button>
        )}
      </div>
    </SheetFooter>
  );
}
