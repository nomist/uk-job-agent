import { describe, expect, it } from "vitest";
import { InvalidSalaryRangeError } from "@/domain/errors/domain-errors";
import { SalaryRange } from "@/domain/value-objects/salary-range";

describe("SalaryRange", () => {
  it("creates a valid range and uppercases the currency", () => {
    const range = SalaryRange.create({ min: 50_000, max: 70_000, currency: "gbp" });

    expect(range.min).toBe(50_000);
    expect(range.max).toBe(70_000);
    expect(range.currency).toBe("GBP");
  });

  it("rejects min greater than max", () => {
    expect(() => SalaryRange.create({ min: 80_000, max: 50_000, currency: "GBP" })).toThrow(
      InvalidSalaryRangeError,
    );
  });

  it("rejects a negative min", () => {
    expect(() => SalaryRange.create({ min: -1, max: 10, currency: "GBP" })).toThrow(
      InvalidSalaryRangeError,
    );
  });

  it("rejects an empty currency", () => {
    expect(() => SalaryRange.create({ min: 0, max: 10, currency: "  " })).toThrow(
      InvalidSalaryRangeError,
    );
  });

  it("allows min to equal max", () => {
    expect(() => SalaryRange.create({ min: 50_000, max: 50_000, currency: "GBP" })).not.toThrow();
  });

  describe("overlaps", () => {
    it("is true for overlapping ranges in the same currency", () => {
      const a = SalaryRange.create({ min: 40_000, max: 60_000, currency: "GBP" });
      const b = SalaryRange.create({ min: 55_000, max: 80_000, currency: "GBP" });
      expect(a.overlaps(b)).toBe(true);
    });

    it("is false for non-overlapping ranges", () => {
      const a = SalaryRange.create({ min: 40_000, max: 50_000, currency: "GBP" });
      const b = SalaryRange.create({ min: 55_000, max: 80_000, currency: "GBP" });
      expect(a.overlaps(b)).toBe(false);
    });

    it("is false across different currencies even if numerically overlapping", () => {
      const a = SalaryRange.create({ min: 40_000, max: 60_000, currency: "GBP" });
      const b = SalaryRange.create({ min: 40_000, max: 60_000, currency: "USD" });
      expect(a.overlaps(b)).toBe(false);
    });
  });
});
