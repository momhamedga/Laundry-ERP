import type { Metadata } from "next";
import { ProfileView } from "@/components/profile/profile-view";

export const metadata: Metadata = { title: "الملف الشخصي" };

export default function Page() {
  return <ProfileView />;
}
