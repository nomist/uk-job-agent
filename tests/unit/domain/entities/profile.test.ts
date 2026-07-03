import { describe, expect, it } from "vitest";
import { Profile } from "@/domain/entities/profile";
import { InvalidProfileError } from "@/domain/errors/domain-errors";
import { SalaryRange } from "@/domain/value-objects/salary-range";

describe("Profile", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("creates a minimal profile with sensible defaults", () => {
    const profile = Profile.create({ id: "p1", userId: "u1", updatedAt: now });

    expect(profile.skills).toEqual([]);
    expect(profile.preferredLocations).toEqual([]);
    expect(profile.workPreferences).toEqual([]);
    expect(profile.visaStatus).toBe("UNKNOWN");
  });

  it("stores preferred locations", () => {
    const profile = Profile.create({
      id: "p1",
      userId: "u1",
      updatedAt: now,
      preferredLocations: ["London", "Manchester", "Remote"],
    });

    expect(profile.preferredLocations).toEqual(["London", "Manchester", "Remote"]);
  });

  it("rejects negative years of experience", () => {
    expect(() =>
      Profile.create({ id: "p1", userId: "u1", updatedAt: now, yearsOfExperience: -1 }),
    ).toThrow(InvalidProfileError);
  });

  it("accepts a salary expectation value object", () => {
    const salaryExpectation = SalaryRange.create({ min: 60_000, max: 80_000, currency: "GBP" });
    const profile = Profile.create({ id: "p1", userId: "u1", updatedAt: now, salaryExpectation });

    expect(profile.salaryExpectation?.min).toBe(60_000);
  });

  describe("isEligibleForMatching", () => {
    it("is false with no work preferences set", () => {
      const profile = Profile.create({ id: "p1", userId: "u1", updatedAt: now });
      expect(profile.isEligibleForMatching()).toBe(false);
    });

    it("is true once at least one work mode is set", () => {
      const profile = Profile.create({
        id: "p1",
        userId: "u1",
        updatedAt: now,
        workPreferences: ["REMOTE"],
      });
      expect(profile.isEligibleForMatching()).toBe(true);
    });
  });
});
