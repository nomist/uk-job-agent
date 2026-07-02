import { describe, expect, it } from "vitest";
import { Company, normalizeCompanyName } from "@/domain/entities/company";
import { InvalidCompanyError } from "@/domain/errors/domain-errors";

describe("Company", () => {
  it("derives a normalized name for dedup matching", () => {
    const company = Company.create({ id: "c1", name: "Acme, Inc." });
    expect(company.normalizedName).toBe("acme inc");
  });

  it("two differently-formatted names normalize to the same key", () => {
    expect(normalizeCompanyName("Acme Corp.")).toBe(normalizeCompanyName("ACME CORP"));
  });

  it("rejects an empty name", () => {
    expect(() => Company.create({ id: "c1", name: "  " })).toThrow(InvalidCompanyError);
  });

  it("rejects an empty id", () => {
    expect(() => Company.create({ id: " ", name: "Acme" })).toThrow(InvalidCompanyError);
  });
});
