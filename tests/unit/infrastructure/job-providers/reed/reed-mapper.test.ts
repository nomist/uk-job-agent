import { describe, expect, it } from "vitest";
import { normalizeCompanyName } from "@/domain/entities/company";
import { mapReedResultToListing } from "@/infrastructure/job-providers/reed/reed-mapper";
import { ReedJobResult } from "@/infrastructure/job-providers/reed/reed-types";

describe("mapReedResultToListing", () => {
  it("maps a full UK job listing", () => {
    const result: ReedJobResult = {
      jobId: 12345678,
      jobTitle: "Staff Software Engineer",
      jobDescription: "We are looking for a strong engineer.",
      jobUrl: "https://www.reed.co.uk/jobs/staff-software-engineer/12345678",
      employerName: "Acme Corp",
      locationName: "London",
      minimumSalary: 60000,
      maximumSalary: 80000,
      currency: "GBP",
      date: "05/07/2026",
      fullTime: true,
      partTime: false,
    };

    const listing = mapReedResultToListing(result);

    expect(listing).not.toBeNull();
    expect(listing?.provider).toBe("REED");
    expect(listing?.externalId).toBe("12345678");
    expect(listing?.title).toBe("Staff Software Engineer");
    expect(listing?.description).toBe("We are looking for a strong engineer.");
    expect(listing?.url).toBe("https://www.reed.co.uk/jobs/staff-software-engineer/12345678");
    expect(listing?.location.city).toBe("London");
    expect(listing?.location.country).toBe("UK");
    expect(listing?.location.isRemote).toBe(false);
    expect(listing?.salaryMin).toBe(60000);
    expect(listing?.salaryMax).toBe(80000);
    expect(listing?.salaryCurrency).toBe("GBP");
    expect(listing?.employmentType).toBe("FULL_TIME");
    expect(listing?.workMode).toBeUndefined();
    // "05/07/2026" is dd/mm/yyyy => 5 July 2026, not 7 May.
    expect(listing?.postedAt).toEqual(new Date(2026, 6, 5));
  });

  it("parses dd/mm/yyyy dates correctly, not as US mm/dd/yyyy", () => {
    const listing = mapReedResultToListing({
      jobId: 1,
      jobTitle: "T",
      jobUrl: "https://x",
      date: "03/11/2026",
    });
    // day=03, month=11 (November) => 3 November, not 11 March.
    expect(listing?.postedAt).toEqual(new Date(2026, 10, 3));
  });

  it("returns undefined postedAt for an unparseable date", () => {
    const listing = mapReedResultToListing({
      jobId: 1,
      jobTitle: "T",
      jobUrl: "https://x",
      date: "not-a-date",
    });
    expect(listing?.postedAt).toBeUndefined();
  });

  it("returns undefined postedAt when date is missing", () => {
    const listing = mapReedResultToListing({ jobId: 1, jobTitle: "T", jobUrl: "https://x" });
    expect(listing?.postedAt).toBeUndefined();
  });

  it("derives a stable companyId from the normalized employer name regardless of formatting", () => {
    const a = mapReedResultToListing({
      jobId: 1,
      jobTitle: "T",
      jobUrl: "https://x",
      employerName: "Acme, Inc.",
    });
    const b = mapReedResultToListing({
      jobId: 2,
      jobTitle: "T",
      jobUrl: "https://x",
      employerName: "ACME INC",
    });

    expect(a?.companyId).toBe(b?.companyId);
  });

  it("defaults to an unknown-company placeholder when employerName is missing", () => {
    const listing = mapReedResultToListing({ jobId: 1, jobTitle: "T", jobUrl: "https://x" });
    expect(listing?.companyId).toBe(normalizeCompanyName("Unknown Company"));
  });

  it("defaults missing description to an empty string", () => {
    const listing = mapReedResultToListing({ jobId: 1, jobTitle: "T", jobUrl: "https://x" });
    expect(listing?.description).toBe("");
  });

  it("omits salary entirely when only one of min/max is present", () => {
    const listing = mapReedResultToListing({
      jobId: 1,
      jobTitle: "T",
      jobUrl: "https://x",
      minimumSalary: 50000,
    });

    expect(listing?.salaryMin).toBeUndefined();
    expect(listing?.salaryMax).toBeUndefined();
    expect(listing?.salaryCurrency).toBeUndefined();
  });

  it("uses Reed's own currency field when present", () => {
    const listing = mapReedResultToListing({
      jobId: 1,
      jobTitle: "T",
      jobUrl: "https://x",
      minimumSalary: 50000,
      maximumSalary: 60000,
      currency: "EUR",
    });

    expect(listing?.salaryCurrency).toBe("EUR");
  });

  it("defaults salary currency to GBP when Reed omits it", () => {
    const listing = mapReedResultToListing({
      jobId: 1,
      jobTitle: "T",
      jobUrl: "https://x",
      minimumSalary: 50000,
      maximumSalary: 60000,
    });

    expect(listing?.salaryCurrency).toBe("GBP");
  });

  it("falls back to no city when locationName is missing, country is always UK", () => {
    const listing = mapReedResultToListing({ jobId: 1, jobTitle: "T", jobUrl: "https://x" });

    expect(listing?.location.country).toBe("UK");
    expect(listing?.location.city).toBeUndefined();
    expect(listing?.location.isRemote).toBe(false);
  });

  it("detects remote roles from the location name", () => {
    const listing = mapReedResultToListing({
      jobId: 1,
      jobTitle: "Engineer",
      jobUrl: "https://x",
      locationName: "Remote",
    });

    expect(listing?.location.isRemote).toBe(true);
    expect(listing?.workMode).toBe("REMOTE");
  });

  it("detects remote roles from the title when the location doesn't say so", () => {
    const listing = mapReedResultToListing({
      jobId: 1,
      jobTitle: "Remote Staff Engineer",
      jobUrl: "https://x",
      locationName: "London",
    });

    expect(listing?.location.isRemote).toBe(true);
  });

  it.each([
    [{ fullTime: true } as Partial<ReedJobResult>, "FULL_TIME"],
    [{ partTime: true } as Partial<ReedJobResult>, "PART_TIME"],
    [{ fullTime: false, partTime: false } as Partial<ReedJobResult>, undefined],
    [{} as Partial<ReedJobResult>, undefined],
  ] as const)("maps %o to employmentType %s", (fields, expected) => {
    const listing = mapReedResultToListing({
      jobId: 1,
      jobTitle: "T",
      jobUrl: "https://x",
      ...fields,
    });

    expect(listing?.employmentType).toBe(expected);
  });

  it("returns null when jobId is missing", () => {
    expect(mapReedResultToListing({ jobTitle: "T", jobUrl: "https://x" })).toBeNull();
  });

  it("returns null when jobTitle is missing", () => {
    expect(mapReedResultToListing({ jobId: 1, jobUrl: "https://x" })).toBeNull();
  });

  it("returns null when jobUrl is missing", () => {
    expect(mapReedResultToListing({ jobId: 1, jobTitle: "T" })).toBeNull();
  });

  it("returns null when jobTitle/jobUrl are blank strings", () => {
    expect(mapReedResultToListing({ jobId: 1, jobTitle: "  ", jobUrl: "https://x" })).toBeNull();
  });

  it("treats jobId 0 as valid (falsy but present)", () => {
    const listing = mapReedResultToListing({ jobId: 0, jobTitle: "T", jobUrl: "https://x" });
    expect(listing?.externalId).toBe("0");
  });
});
