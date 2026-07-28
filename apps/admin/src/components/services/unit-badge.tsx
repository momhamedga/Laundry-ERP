import { Badge } from "@/components/ui/badge";
import { UNIT_LABELS } from "@/constants/services";
import type { ServiceUnit } from "@/types/service";

export function UnitBadge({ unit }: { unit: ServiceUnit }) {
  return <Badge variant="outline">{UNIT_LABELS[unit]}</Badge>;
}
