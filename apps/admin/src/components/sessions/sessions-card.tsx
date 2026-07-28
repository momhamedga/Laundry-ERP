import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SessionsCardProps {
  children: React.ReactNode;
}

/** بطاقة تجميع الجلسات النشطة - عنوان+أيقونة، بنفس نمط بطاقات الوحدات الأخرى */
export function SessionsCard({ children }: SessionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <ShieldCheck className="size-4" aria-hidden /> الجلسات النشطة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
