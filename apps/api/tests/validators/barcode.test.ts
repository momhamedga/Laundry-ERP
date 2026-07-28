import { describe, expect, it } from "vitest";
import {
  bulkGenerateSchema,
  generateSchema,
  printSchema,
  updateBarcodeSchema,
} from "../../src/modules/barcode/barcode.validator";

const CUID = "cme0000000000000000000000";

describe("barcode.validator — generate / bulk", () => {
  it("generateSchema defaults mode=auto and withQr=true", () => {
    const r = generateSchema.safeParse({ type: "EAN13" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.mode).toBe("auto");
      expect(r.data.withQr).toBe(true);
    }
  });

  it("generateSchema rejects an unknown barcode type", () => {
    expect(generateSchema.safeParse({ type: "PDF417" }).success).toBe(false);
  });

  it("bulkGenerateSchema requires at least one item id", () => {
    expect(bulkGenerateSchema.safeParse({ itemIds: [], type: "QR" }).success).toBe(false);
    expect(bulkGenerateSchema.safeParse({ itemIds: [CUID], type: "QR" }).success).toBe(true);
  });
});

describe("barcode.validator — print / update", () => {
  it("printSchema requires at least one item and defaults size A4", () => {
    const r = printSchema.safeParse({ items: [{ itemId: CUID }] });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.size).toBe("A4");
      expect(r.data.items[0]?.quantity).toBe(1);
    }
    expect(printSchema.safeParse({ items: [] }).success).toBe(false);
  });

  it("printSchema rejects zero label quantity", () => {
    expect(printSchema.safeParse({ items: [{ itemId: CUID, quantity: 0 }] }).success).toBe(false);
  });

  it("updateBarcodeSchema rejects an empty patch", () => {
    expect(updateBarcodeSchema.safeParse({}).success).toBe(false);
    expect(updateBarcodeSchema.safeParse({ type: "UPC" }).success).toBe(true);
  });
});
