"use client";

import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useOrderDraftStore } from "@/store/order-draft-store";
import type { OrderDetail } from "@/types/orders";
import { CustomerSelectionStep } from "./customer-selection-step";
import { CustomerSummary } from "./customer-summary";
import { OrderSuccessState } from "./order-success-state";
import { ReviewStep } from "./review-step";
import { ServiceSelectionStep } from "./service-selection-step";
import { WizardFooter } from "./wizard-footer";
import { WizardHeader } from "./wizard-header";

interface CreateOrderWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = ["العميل", "الخدمات", "المراجعة"] as const;

/**
 * معالج إنشاء طلب جديد - Phase 10.2C تضيف خطوة المراجعة والإرسال كاملة فوق
 * خطوتي اختيار العميل (10.2A) واختيار الخدمات (10.2B). خطوة 3 تعرض ReviewStep
 * حتى نجاح الإنشاء، ثم OrderSuccessState بنفس مكانها (بلا انتقال لصفحة أخرى).
 */
export function CreateOrderWizard({ open, onOpenChange }: CreateOrderWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [createdOrder, setCreatedOrder] = useState<OrderDetail | null>(null);
  const [createdPaidAmount, setCreatedPaidAmount] = useState<number | undefined>(undefined);
  const customer = useOrderDraftStore((s) => s.customer);
  const setCustomer = useOrderDraftStore((s) => s.setCustomer);
  const items = useOrderDraftStore((s) => s.items);
  const reset = useOrderDraftStore((s) => s.reset);

  function handleOpenChange(next: boolean) {
    if (!next) {
      // إعادة ضبط كاملة عند الإغلاق - لا حالة قديمة عند فتح معالج جديد
      setStep(1);
      setCreatedOrder(null);
      setCreatedPaidAmount(undefined);
      reset();
    }
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <WizardHeader
          title="طلب جديد"
          description="اختر العميل للمتابعة"
          steps={STEPS}
          currentStep={step}
        />

        {step < 3 && (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-4">
              {step === 1 && (
                <CustomerSelectionStep selectedCustomer={customer} onSelect={setCustomer} />
              )}
              {step === 2 && customer && (
                <div className="space-y-3">
                  <CustomerSummary customer={customer} />
                  <ServiceSelectionStep />
                </div>
              )}
            </div>
            <WizardFooter
              onCancel={() => handleOpenChange(false)}
              onBack={step === 2 ? () => setStep(1) : undefined}
              onNext={() => setStep(step === 1 ? 2 : 3)}
              nextDisabled={(step === 1 && !customer) || (step === 2 && items.length === 0)}
            />
          </>
        )}

        {step === 3 && customer && !createdOrder && (
          <ReviewStep
            onBack={() => setStep(2)}
            onCancel={() => handleOpenChange(false)}
            onSuccess={(order, paidAmount) => {
              setCreatedOrder(order);
              setCreatedPaidAmount(paidAmount);
            }}
          />
        )}

        {step === 3 && createdOrder && (
          <OrderSuccessState
            order={createdOrder}
            paidAmount={createdPaidAmount}
            onClose={() => handleOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
