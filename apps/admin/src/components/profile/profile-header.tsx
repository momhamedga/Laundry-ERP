"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import { RoleBadge } from "@/components/users/role-badge";
import type { User } from "@/types/user";

function initials(name: string): string {
  return name.trim().charAt(0) || "؟";
}

interface ProfileHeaderProps {
  user: User;
}

/** رأس الملف الشخصي - Avatar Placeholder فقط (بلا رفع/كاميرا/قص - Endpoint الرفع يعيد 501) */
export function ProfileHeader({ user }: ProfileHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5"
    >
      <Avatar size="lg" className="size-16">
        <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
        <AvatarFallback className="bg-primary/10 text-lg text-primary">
          {initials(user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-bold">{user.name}</h2>
        <p dir="ltr" className="truncate text-start text-sm text-muted-foreground">
          {user.email}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <RoleBadge role={user.role} />
        <CustomerStatusBadge isActive={user.isActive} />
      </div>
    </motion.div>
  );
}
