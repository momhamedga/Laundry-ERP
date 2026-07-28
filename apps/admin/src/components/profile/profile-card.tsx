import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileCardProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}

/** بطاقة قسم عامة (عنوان+أيقونة) - إطار مشترك بين ProfileInformation وProfileForm */
export function ProfileCard({ icon: Icon, title, children }: ProfileCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Icon className="size-4" aria-hidden /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
