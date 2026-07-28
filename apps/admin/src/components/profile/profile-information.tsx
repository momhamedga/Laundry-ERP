import { Building2, Calendar, IdCard, Mail, Phone, ShieldCheck, ToggleLeft } from "lucide-react";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import { RoleBadge } from "@/components/users/role-badge";
import { UserSessionsCard } from "@/components/users/user-sessions-card";
import { useActiveBranchesQuery } from "@/hooks/use-branches";
import { formatDate } from "@/lib/format";
import type { UserDetails } from "@/types/user";
import { ProfileCard } from "./profile-card";

interface ProfileInformationProps {
  profile: UserDetails;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

/** عرض كامل بيانات الملف الشخصي - للقراءة فقط (لا تحرير هنا - راجع ProfileForm) */
export function ProfileInformation({ profile }: ProfileInformationProps) {
  const { user, lastLoginAt, activeSessions } = profile;
  const { data: branches } = useActiveBranchesQuery();
  const branchName = user.branchId
    ? (branches?.find((b) => b.id === user.branchId)?.name ?? "فرع غير نشط")
    : "بلا فرع";

  return (
    <div className="space-y-4">
      <ProfileCard icon={IdCard} title="البيانات الأساسية">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow icon={Mail} label="البريد الإلكتروني" value={<span dir="ltr">{user.email}</span>} />
          <InfoRow
            icon={Phone}
            label="رقم الهاتف"
            value={user.phone ? <span dir="ltr">{user.phone}</span> : "—"}
          />
          <InfoRow icon={ShieldCheck} label="الدور" value={<RoleBadge role={user.role} />} />
          <InfoRow icon={Building2} label="الفرع" value={branchName} />
          <InfoRow
            icon={ToggleLeft}
            label="الحالة"
            value={<CustomerStatusBadge isActive={user.isActive} />}
          />
          <InfoRow icon={Calendar} label="تاريخ إنشاء الحساب" value={formatDate(user.createdAt)} />
        </div>
      </ProfileCard>

      <UserSessionsCard activeSessions={activeSessions} lastLoginAt={lastLoginAt} />
    </div>
  );
}
