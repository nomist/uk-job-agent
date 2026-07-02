import { describe, expect, it } from "vitest";
import { MockJobProvider } from "@/infrastructure/job-providers/mock/mock-job-provider";

describe("MockJobProvider", () => {
  it("exposes its provider name as MOCK", () => {
    expect(new MockJobProvider().name).toBe("MOCK");
  });

  it("returns a fixed, non-empty set of realistic UK listings with no params", async () => {
    const listings = await new MockJobProvider().search({});

    expect(listings.length).toBeGreaterThan(0);
    for (const listing of listings) {
      expect(listing.provider).toBe("MOCK");
      expect(listing.title.length).toBeGreaterThan(0);
      expect(listing.url).toMatch(/^https:\/\//);
      expect(listing.location.country).toBe("UK");
    }
  });

  it("includes at least one listing with a salary and one without", async () => {
    const listings = await new MockJobProvider().search({});

    expect(listings.some((listing) => listing.salaryMin !== undefined)).toBe(true);
    expect(listings.some((listing) => listing.salaryMin === undefined)).toBe(true);
  });

  it("includes at least one remote listing", async () => {
    const listings = await new MockJobProvider().search({});
    expect(listings.some((listing) => listing.location.isRemote)).toBe(true);
  });

  it("filters by keywords against title and description, case-insensitively", async () => {
    const listings = await new MockJobProvider().search({ keywords: "DEVOPS" });

    expect(listings.length).toBeGreaterThan(0);
    for (const listing of listings) {
      expect(`${listing.title} ${listing.description}`.toLowerCase()).toContain("devops");
    }
  });

  it("returns an empty array for keywords that match nothing", async () => {
    const listings = await new MockJobProvider().search({ keywords: "underwater basket weaving" });
    expect(listings).toEqual([]);
  });

  it("filters by location against city and region, case-insensitively", async () => {
    const listings = await new MockJobProvider().search({ location: "manchester" });

    expect(listings.length).toBeGreaterThan(0);
    for (const listing of listings) {
      const haystack =
        `${listing.location.city ?? ""} ${listing.location.region ?? ""}`.toLowerCase();
      expect(haystack).toContain("manchester");
    }
  });

  it("excludes listings whose salary max is below salaryMin, but keeps salary-less ones", async () => {
    const listings = await new MockJobProvider().search({ salaryMin: 100000 });

    // None of the salaried mock listings clear a 100k bar, so only the
    // listing with no salary info at all (can't tell if it qualifies)
    // survives the filter.
    expect(listings.every((listing) => listing.salaryMax === undefined)).toBe(true);
    expect(listings.length).toBeGreaterThan(0);
  });

  it("excludes salaried listings once salaryMin exceeds every known max", async () => {
    const allListings = await new MockJobProvider().search({});
    const filtered = await new MockJobProvider().search({ salaryMin: 100000 });

    const salariedTitles = allListings
      .filter((listing) => listing.salaryMax !== undefined)
      .map((listing) => listing.title);
    const filteredTitles = filtered.map((listing) => listing.title);

    for (const title of salariedTitles) {
      expect(filteredTitles).not.toContain(title);
    }
  });

  it("combines keyword and location filters", async () => {
    const listings = await new MockJobProvider().search({
      keywords: "engineer",
      location: "bristol",
    });
    expect(listings).toHaveLength(1);
    expect(listings[0].title).toBe("Junior Software Engineer");
  });
});
