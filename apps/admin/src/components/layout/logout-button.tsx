"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useLogout } from "@/hooks/use-auth";

/** زر تسجيل الخروج - يستدعي الـ API ويفرغ الجلسة والكاش */
export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const logout = useLogout();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await logout();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size={collapsed ? "icon" : "sm"}
      onClick={handleLogout}
      disabled={pending}
      className="justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      {pending ? <Spinner className="text-destructive" /> : <LogOut aria-hidden />}
      {!collapsed && <span>تسجيل الخروج</span>}
    </Button>
  );
}
