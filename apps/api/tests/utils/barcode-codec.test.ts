import { describe, expect, it } from "vitest";
import {
  generateBarcodeValue,
  generateRandomSku,
  isValidBarcodeValue,
} from "../../src/modules/barcode/barcode.codec";

describe("barcode.codec — generate ⇄ validate round-trip", () => {
  it("EAN13/EAN8/UPC generate valid checksummed values", () => {
    for (let i = 0; i < 20; i++) {
      const ean13 = generateBarcodeValue("EAN13");
      expect(ean13).toMatch(/^\d{13}$/);
      expect(isValidBarcodeValue("EAN13", ean13)).toBe(true);

      const ean8 = generateBarcodeValue("EAN8");
      expect(ean8).toMatch(/^\d{8}$/);
      expect(isValidBarcodeValue("EAN8", ean8)).toBe(true);

      const upc = generateBarcodeValue("UPC");
      expect(upc).toMatch(/^\d{12}$/);
      expect(isValidBarcodeValue("UPC", upc)).toBe(true);
    }
  });

  it("CODE39 upper-cases the seed and validates", () => {
    const v = generateBarcodeValue("CODE39", "sku-123");
    expect(v).toBe("SKU-123");
    expect(isValidBarcodeValue("CODE39", v)).toBe(true);
  });

  it("QR round-trips the SKU payload", () => {
    expect(generateBarcodeValue("QR", "ITEM-9")).toBe("ITEM-9");
    expect(isValidBarcodeValue("QR", "ITEM-9")).toBe(true);
  });
});

describe("barcode.codec — isValidBarcodeValue negatives", () => {
  it("rejects an EAN13 with a wrong checksum", () => {
    const ok = generateBarcodeValue("EAN13");
    const badLast = ((Number(ok[12]) + 1) % 10).toString();
    expect(isValidBarcodeValue("EAN13", ok.slice(0, 12) + badLast)).toBe(false);
  });

  it("rejects wrong length / non-digit / empty", () => {
    expect(isValidBarcodeValue("EAN13", "123")).toBe(false);
    expect(isValidBarcodeValue("UPC", "12345678901A")).toBe(false);
    expect(isValidBarcodeValue("QR", "")).toBe(false);
  });

  it("rejects lowercase in CODE39 but accepts ASCII in CODE128", () => {
    expect(isValidBarcodeValue("CODE39", "abc")).toBe(false);
    expect(isValidBarcodeValue("CODE128", "Item#42")).toBe(true);
  });
});

describe("barcode.codec — generateRandomSku", () => {
  it("produces a prefixed uppercase sku", () => {
    expect(generateRandomSku()).toMatch(/^SKU-[A-Z0-9]+$/);
    expect(generateRandomSku("RAW")).toMatch(/^RAW-/);
  });
});
