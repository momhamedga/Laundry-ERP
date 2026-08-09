/**
 * تخطيط صفحات المصادقة — توسيط بدون Sidebar/Header.
 *
 * الخلفية طبقتان من التدرّجات الشعاعية بدل لون مسطّح: تعطي عمقاً هادئاً يجعل
 * البطاقة تبدو طافية بدل ملصقة. كلاهما مبنيّ على رموز الثيم (primary/background)
 * فيتبدّلان مع الوضع الفاتح والداكن بلا قيم لونية ثابتة.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background p-4">
      {/* توهّج علوي خافت — يوجّه العين نحو البطاقة */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 start-1/2 h-180 w-180 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      {/* توهّج سفلي أخفت — يمنع فراغ أسفل الشاشة */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-1/4 end-0 h-120 w-120 rounded-full bg-primary/5 blur-3xl"
      />
      {/* شبكة رفيعة جداً تكسر السطح المصمت */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] bg-size-[44px_44px] opacity-[0.035]"
      />
      <div className="relative w-full">{children}</div>
    </div>
  );
}
