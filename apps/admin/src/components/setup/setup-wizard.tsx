"use client";

import { CircleCheck, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppLogo } from "@/components/layout/app-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { SetupBranchStep } from "./setup-branch-step";
import { SetupProgress, type SetupStepMeta } from "./setup-progress";
import { SetupServicesStep, type CreatedService } from "./setup-services-step";
import { SetupUsersStep, type CreatedUser } from "./setup-users-step";

const STEPS: readonly SetupStepMeta[] = [
  { key: "branch", title: "الفرع" },
  { key: "services", title: "الخدمات" },
  { key: "users", title: "المستخدمون" },
  { key: "done", title: "جاهز" },
];

interface CreatedBranch {
  id: string;
  name: string;
}

/**
 * معالج التهيئة الأولى.
 *
 * الاستئناف بعد التحديث مشتقٌّ من الحالة الفعلية لا من تخزين محلّي: الخطوة
 * الأولى تُعرَض إن لم يوجد فرع نشط (وهو ما يقرّره useSetupStatus من الخادم)،
 * والخطوة الثانية تقرأ التصنيفات والخدمات من الخادم مباشرةً. فلا يحتاج المعالج
 * إلى localStorage أصلاً — وهو ما يمنع تخزين أي شيء حسّاس ويمنع حالةً محفوظة
 * تناقض ما في قاعدة البيانات.
 *
 * القوائم أدناه للعرض داخل الجلسة فقط (ملخّص ما أُنشئ الآن)؛ ضياعها بالتحديث
 * لا يفقد بيانات — البيانات في الخادم.
 */
export function SetupWizard({ initialBranch }: { initialBranch: CreatedBranch | null }) {
  const router = useRouter();
  const [branch, setBranch] = useState<CreatedBranch | null>(initialBranch);
  const [services, setServices] = useState<CreatedService[]>([]);
  const [users, setUsers] = useState<CreatedUser[]>([]);
  const [step, setStep] = useState(initialBranch ? 1 : 0);

  function goToDashboard() {
    /**
     * replace لا push: زرّ الرجوع بعد الدخول للوحة يجب ألّا يعيد المستخدم إلى
     * معالج تهيئة اكتملت. وrefresh لتُعاد قراءة حالة التهيئة من الخادم.
     */
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <AppLogo />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">تهيئة النظام</h1>
          <p className="text-sm text-muted-foreground">
            خطوات قصيرة تجعل النظام جاهزاً لاستقبال أول طلب.
          </p>
        </div>
      </div>

      <Card className="border-border/60 shadow-xl shadow-black/5">
        <CardContent className="space-y-6 p-5 sm:p-7">
          <SetupProgress steps={STEPS} current={step} />

          {step === 0 && (
            <SetupBranchStep
              onCreated={(created) => {
                setBranch(created);
                setStep(1);
              }}
            />
          )}

          {step === 1 && (
            <SetupServicesStep
              services={services}
              onServiceCreated={(s) => setServices((prev) => [...prev, s])}
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && branch && (
            <SetupUsersStep
              branch={branch}
              users={users}
              onUserCreated={(u) => setUsers((prev) => [...prev, u])}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <CircleCheck className="size-10 text-emerald-600" aria-hidden />
                <h2 className="text-lg font-semibold">النظام جاهز للاستخدام</h2>
                <p className="text-sm text-muted-foreground">
                  يمكنك الآن إنشاء أول طلب. أي تعديل لاحق متاح من صفحات الفروع والخدمات
                  والمستخدمين.
                </p>
              </div>

              <dl className="divide-y rounded-lg border text-sm">
                <div className="flex items-start justify-between gap-4 px-4 py-3">
                  <dt className="text-muted-foreground">الفرع</dt>
                  <dd className="text-end font-medium">{branch?.name ?? "—"}</dd>
                </div>
                <div className="flex items-start justify-between gap-4 px-4 py-3">
                  <dt className="text-muted-foreground">الخدمات</dt>
                  <dd className="text-end">
                    {services.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {services.map((s) => (
                          <li key={s.id}>
                            <span className="font-medium">{s.name}</span>{" "}
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(s.price)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 px-4 py-3">
                  <dt className="text-muted-foreground">المستخدمون</dt>
                  <dd className="text-end">
                    {users.length === 0 ? (
                      <span className="text-muted-foreground">حسابك وحده</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {users.map((u) => (
                          <li key={u.id} className="font-medium">
                            {u.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
              </dl>

              <Button type="button" size="lg" className="w-full" onClick={goToDashboard}>
                <LayoutDashboard aria-hidden />
                الذهاب إلى لوحة التحكم
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
