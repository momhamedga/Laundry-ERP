import type { Metadata } from "next";
import { ChangePasswordView } from "@/components/profile/change-password-view";

export const metadata: Metadata = { title: "تغيير كلمة المرور" };

export default function Page() {
  return <ChangePasswordView />;
}
