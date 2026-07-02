import { describe, expect, it } from "vitest";
import { Resume } from "@/domain/entities/resume";
import { InvalidResumeError } from "@/domain/errors/domain-errors";

describe("Resume", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  const build = (overrides: Partial<Parameters<typeof Resume.create>[0]> = {}) =>
    Resume.create({
      id: "r1",
      profileId: "p1",
      label: "General",
      content: "Staff Engineer, 10 years...",
      createdAt: now,
      ...overrides,
    });

  it("creates a resume that defaults isPrimary to false", () => {
    const resume = build();
    expect(resume.isPrimary).toBe(false);
  });

  it("rejects empty content", () => {
    expect(() => build({ content: "  " })).toThrow(InvalidResumeError);
  });

  it("rejects an empty label", () => {
    expect(() => build({ label: "  " })).toThrow(InvalidResumeError);
  });

  it("markAsPrimary returns a new instance without mutating the original", () => {
    const original = build();
    const primary = original.markAsPrimary();

    expect(original.isPrimary).toBe(false);
    expect(primary.isPrimary).toBe(true);
    expect(primary).not.toBe(original);
  });

  it("unmarkAsPrimary reverses markAsPrimary", () => {
    const resume = build({ isPrimary: true }).unmarkAsPrimary();
    expect(resume.isPrimary).toBe(false);
  });

  it("has no content-mutation method — editing requires creating a new Resume", () => {
    expect((build() as unknown as Record<string, unknown>).update).toBeUndefined();
  });
});
