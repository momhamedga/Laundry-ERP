import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WizardProgress } from "./wizard-progress";

interface WizardHeaderProps {
  title: string;
  description?: string;
  steps: readonly string[];
  currentStep: number;
}

/** رأس عام لأي معالج متعدد الخطوات - عنوان + وصف + مؤشر تقدم */
export function WizardHeader({ title, description, steps, currentStep }: WizardHeaderProps) {
  return (
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      {description && <SheetDescription>{description}</SheetDescription>}
      <div className="pt-2">
        <WizardProgress steps={steps} currentStep={currentStep} />
      </div>
    </SheetHeader>
  );
}
