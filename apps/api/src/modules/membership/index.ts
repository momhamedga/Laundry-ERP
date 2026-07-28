import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { MembershipController } from "./membership.controller.js";
import { MembershipRepository } from "./membership.repository.js";
import { createMembershipRouter } from "./membership.routes.js";
import { MembershipService } from "./membership.service.js";

/** خدمة مفردة تُشارَك مع وحدتي الولاء والكوبونات (تقييم المستوى/المزايا) */
export const membershipService = new MembershipService(new MembershipRepository(prisma));

/** Composition Root لوحدة العضوية */
export function buildMembershipModule(): Router {
  const controller = new MembershipController(membershipService);
  return createMembershipRouter(controller);
}

export { MembershipService } from "./membership.service.js";
