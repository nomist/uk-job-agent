import { describe, expect, it } from "vitest";
import { Job } from "@/domain/entities/job";
import { InvalidJobError } from "@/domain/errors/domain-errors";
import { Location } from "@/domain/value-objects/location";

describe("Job", () => {
  const now = new Date("2026-07-01T00:00:00Z");
  const location = Location.create({ city: "London", country: "UK", isRemote: false });

  const build = (overrides: Partial<Parameters<typeof Job.create>[0]> = {}) =>
    Job.create({
      id: "j1",
      companyId: "c1",
      provider: "ADZUNA",
      externalId: "ext-1",
      title: "Staff Engineer",
      description: "Build things.",
      location,
      url: "https://example.com/jobs/1",
      firstSeenAt: now,
      lastSeenAt: now,
      ...overrides,
    });

  it("creates a job with isExpired defaulting to false", () => {
    expect(build().isExpired).toBe(false);
  });

  it("rejects a non-absolute url", () => {
    expect(() => build({ url: "/jobs/1" })).toThrow(InvalidJobError);
  });

  it("rejects an empty title", () => {
    expect(() => build({ title: "  " })).toThrow(InvalidJobError);
  });

  it("rejects lastSeenAt before firstSeenAt", () => {
    const earlier = new Date(now.getTime() - 1000);
    expect(() => build({ lastSeenAt: earlier })).toThrow(InvalidJobError);
  });

  it("rejects a job listed as its own canonical duplicate", () => {
    expect(() => build({ canonicalJobId: "j1" })).toThrow(InvalidJobError);
  });

  describe("recordSighting", () => {
    it("bumps lastSeenAt and un-expires the job", () => {
      const later = new Date(now.getTime() + 86_400_000);
      const expired = build().markExpired();

      const sighted = expired.recordSighting(later);

      expect(sighted.lastSeenAt).toEqual(later);
      expect(sighted.isExpired).toBe(false);
    });

    it("rejects a sighting before firstSeenAt", () => {
      const earlier = new Date(now.getTime() - 1000);
      expect(() => build().recordSighting(earlier)).toThrow(InvalidJobError);
    });

    it("does not mutate the original instance", () => {
      const original = build();
      const later = new Date(now.getTime() + 1000);
      original.recordSighting(later);

      expect(original.lastSeenAt).toEqual(now);
    });
  });

  describe("markExpired", () => {
    it("returns a new instance with isExpired true", () => {
      const original = build();
      const expired = original.markExpired();

      expect(original.isExpired).toBe(false);
      expect(expired.isExpired).toBe(true);
    });
  });

  describe("assignToCanonical", () => {
    it("sets the canonical duplicate group", () => {
      const job = build().assignToCanonical("j2");
      expect(job.canonicalJobId).toBe("j2");
    });

    it("rejects assigning itself as canonical", () => {
      expect(() => build().assignToCanonical("j1")).toThrow(InvalidJobError);
    });

    it("rejects an empty canonical id", () => {
      expect(() => build().assignToCanonical("  ")).toThrow(InvalidJobError);
    });
  });

  describe("isSameProviderListing", () => {
    it("is true for the same provider + externalId", () => {
      const a = build();
      const b = build({ id: "j2", title: "Different title" });
      expect(a.isSameProviderListing(b)).toBe(true);
    });

    it("is false for a different provider", () => {
      const a = build();
      const b = build({ id: "j2", provider: "REED" });
      expect(a.isSameProviderListing(b)).toBe(false);
    });
  });
});
