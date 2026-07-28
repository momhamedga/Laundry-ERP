import type { DayStatus } from "@/types/day-closing";

export const DAY_STATUS_LABELS: Record<DayStatus, string> = {
  OPEN: "مفتوح",
  CLOSED: "مُغلق",
  REOPENED: "أُعيد فتحه",
};

export const DAY_STATUS_BADGE: Record<DayStatus, "default" | "secondary" | "outline"> = {
  OPEN: "default",
  CLOSED: "secondary",
  REOPENED: "outline",
};

/** لون فرق الصندوق: صفر=محايد، موجب=زيادة، سالب=عجز */
export function differenceTone(diff: number | null): "default" | "success" | "destructive" {
  if (diff === null || diff === 0) return "default";
  return diff > 0 ? "success" : "destructive";
}
