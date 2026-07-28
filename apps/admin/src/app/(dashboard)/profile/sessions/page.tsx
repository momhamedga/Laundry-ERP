import type { Metadata } from "next";
import { SessionsView } from "@/components/sessions/sessions-view";

export const metadata: Metadata = { title: "الجلسات النشطة" };

export default function Page() {
  return <SessionsView />;
}
