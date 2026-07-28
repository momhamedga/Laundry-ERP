export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export const UNIT_LABELS: Record<"PIECE" | "KG" | "FIXED", string> = {
  PIECE: "بالقطعة",
  KG: "بالكيلو",
  FIXED: "سعر ثابت",
};
