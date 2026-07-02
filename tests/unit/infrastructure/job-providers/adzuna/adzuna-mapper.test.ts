import { describe, expect, it } from "vitest";
import { normalizeCompanyName } from "@/domain/entities/company";
import { AdzunaConfig } from "@/infrastructure/job-providers/adzuna/adzuna-config";
import { mapAdzunaResultToListing } from "@/infrastructure/job-providers/adzuna/adzuna-mapper";
import { AdzunaJobResult } from "@/infrastructure/job-providers/adzuna/adzuna-types";

const config: AdzunaConfig = { appId: "id", appKey: "key", country: "gb" };

describe("mapAdzunaResultToListing", () => {
  it("maps a full UK job listing", () => {
    const result: AdzunaJobResult = {
      id: "123",
      title: "Staff Software Engineer",
      description: "Build great things.",
      redirect_url: "https://www.adzuna.co.uk/jobs/land/ad/123",
      company: { display_name: "Acme Corp" },
      location: { area: ["UK", "England", "Greater London", "London"], display_name: "London" },
      salary_min: 70000,
      salary_max: 90000,
      contract_type: "permanent",
      contract_time: "full_time",
      created: "2026-06-01T10:00:00Z",
    };

    const listing = mapAdzunaResultToListing(result, config);

    expect(listing).not.toBeNull();
    expect(listing?.provider).toBe("ADZUNA");
    expect(listing?.externalId).toBe("123");
    expect(listing?.title).toBe("Staff Software Engineer");
    expect(listing?.description).toBe("Build great things.");
    expect(listing?.url).toBe("https://www.adzuna.co.uk/jobs/land/ad/123");
    expect(listing?.location.city).toBe("London");
    expect(listing?.location.country).toBe("UK");
    expect(listing?.location.region).toBe("England");
    expect(listing?.location.isRemote).toBe(false);
    expect(listing?.salaryMin).toBe(70000);
    expect(listing?.salaryMax).toBe(90000);
    expect(listing?.salaryCurrency).toBe("GBP");
    expect(listing?.employmentType).toBe("FULL_TIME");
    expect(listing?.workMode).toBeUndefined();
    expect(listing?.postedAt).toEqual(new Date("2026-06-01T10:00:00Z"));
  });

  it("derives a stable companyId from the normalized company name regardless of formatting", () => {
    const a = mapAdzunaResultToListing(
      { id: "1", title: "T", redirect_url: "https://x", company: { display_name: "Acme, Inc." } },
      config,
    );
    const b = mapAdzunaResultToListing(
      { id: "2", title: "T", redirect_url: "https://x", company: { display_name: "ACME INC" } },
      config,
    );

    expect(a?.companyId).toBe(b?.companyId);
  });

  it("defaults to an unknown-company placeholder when company is missing", () => {
    const listing = mapAdzunaResultToListing(
      { id: "1", title: "T", redirect_url: "https://x" },
      config,
    );
    expect(listing?.companyId).toBe(normalizeCompanyName("Unknown Company"));
  });

  it("defaults missing description to an empty string", () => {
    const listing = mapAdzunaResultToListing(
      { id: "1", title: "T", redirect_url: "https://x" },
      config,
    );
    expect(listing?.description).toBe("");
  });

  it("omits salary entirely when only one of min/max is present", () => {
    const listing = mapAdzunaResultToListing(
      { id: "1", title: "T", redirect_url: "https://x", salary_min: 50000 },
      config,
    );

    expect(listing?.salaryMin).toBeUndefined();
    expect(listing?.salaryMax).toBeUndefined();
    expect(listing?.salaryCurrency).toBeUndefined();
  });

  it("falls back to the configured country and no city when location is missing", () => {
    const listing = mapAdzunaResultToListing(
      { id: "1", title: "T", redirect_url: "https://x" },
      config,
    );

    expect(listing?.location.country).toBe("UK");
    expect(listing?.location.city).toBeUndefined();
    expect(listing?.location.region).toBeUndefined();
    expect(listing?.location.isRemote).toBe(false);
  });

  it("detects remote roles from the location display name", () => {
    const listing = mapAdzunaResultToListing(
      {
        id: "1",
        title: "Engineer",
        redirect_url: "https://x",
        location: { display_name: "Remote" },
      },
      config,
    );

    expect(listing?.location.isRemote).toBe(true);
    expect(listing?.workMode).toBe("REMOTE");
  });

  it("detects remote roles from the title when the location doesn't say so", () => {
    const listing = mapAdzunaResultToListing(
      {
        id: "1",
        title: "Remote Staff Engineer",
        redirect_url: "https://x",
        location: { display_name: "London" },
      },
      config,
    );

    expect(listing?.location.isRemote).toBe(true);
  });

  it("does not populate region when the location hierarchy is shallow", () => {
    const listing = mapAdzunaResultToListing(
      { id: "1", title: "T", redirect_url: "https://x", location: { area: ["UK", "London"] } },
      config,
    );

    expect(listing?.location.region).toBeUndefined();
  });

  it.each([
    [{ contract_type: "contract" } as Partial<AdzunaJobResult>, "CONTRACT"],
    [{ contract_time: "part_time" } as Partial<AdzunaJobResult>, "PART_TIME"],
    [{ contract_time: "full_time" } as Partial<AdzunaJobResult>, "FULL_TIME"],
    [{} as Partial<AdzunaJobResult>, undefined],
  ] as const)("maps contract fields %o to employmentType %s", (fields, expected) => {
    const listing = mapAdzunaResultToListing(
      { id: "1", title: "T", redirect_url: "https://x", ...fields },
      config,
    );

    expect(listing?.employmentType).toBe(expected);
  });

  it("returns null when id is missing", () => {
    expect(mapAdzunaResultToListing({ title: "T", redirect_url: "https://x" }, config)).toBeNull();
  });

  it("returns null when title is missing", () => {
    expect(mapAdzunaResultToListing({ id: "1", redirect_url: "https://x" }, config)).toBeNull();
  });

  it("returns null when redirect_url is missing", () => {
    expect(mapAdzunaResultToListing({ id: "1", title: "T" }, config)).toBeNull();
  });

  it("returns null when id/title/url are blank strings", () => {
    expect(
      mapAdzunaResultToListing({ id: "  ", title: "T", redirect_url: "https://x" }, config),
    ).toBeNull();
  });
});
