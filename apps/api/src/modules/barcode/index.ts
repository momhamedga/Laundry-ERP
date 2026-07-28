import type { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { BarcodeController } from "./barcode.controller.js";
import { BarcodeRepository } from "./barcode.repository.js";
import { createBarcodeRouter } from "./barcode.routes.js";
import { BarcodeService } from "./barcode.service.js";

/** Composition Root لوحدة الباركود */
export function buildBarcodeModule(): Router {
  const repository = new BarcodeRepository(prisma);
  const service = new BarcodeService(repository);
  const controller = new BarcodeController(service);
  return createBarcodeRouter(controller);
}

export { BarcodeService } from "./barcode.service.js";
