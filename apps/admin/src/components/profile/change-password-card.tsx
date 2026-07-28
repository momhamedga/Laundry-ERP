import { KeyRound } from "lucide-react";
import { ProfileCard } from "./profile-card";

interface ChangePasswordCardProps {
  children: React.ReactNode;
}

/** غلاف رفيع فوق ProfileCard الموجود - بلا تكرار منطق البطاقة */
export function ChangePasswordCard({ children }: ChangePasswordCardProps) {
  return (
    <ProfileCard icon={KeyRound} title="تغيير كلمة المرور">
      {children}
    </ProfileCard>
  );
}
