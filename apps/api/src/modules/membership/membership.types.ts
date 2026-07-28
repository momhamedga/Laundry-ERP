import type { MembershipLevel, MembershipTierConfig } from "@prisma/client";

export interface TierEvaluation {
  changed: boolean;
  oldLevel: MembershipLevel;
  newLevel: MembershipLevel;
  direction: "UP" | "DOWN" | "NONE";
}

export interface MembershipDistributionRow {
  level: MembershipLevel;
  count: number;
}

export type { MembershipTierConfig, MembershipLevel };
