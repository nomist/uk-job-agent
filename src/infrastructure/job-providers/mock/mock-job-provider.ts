import { JobProviderListing, JobProviderSearchParams } from "@/application/dto/job-provider.dto";
import { JobProvider } from "@/application/ports/job-provider.port";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

/**
 * Fixed, realistic-looking UK listings used only as a local-development
 * fallback (see createContainer in src/lib/di/container.ts) when neither
 * Adzuna nor Reed has credentials configured. Never used in production.
 * Deliberately includes variety: with/without salary, different employment
 * types and work modes, so the UI's rendering paths all get exercised.
 */
function buildMockListings(): JobProviderListing[] {
  return [
    {
      provider: "MOCK",
      externalId: "mock-1",
      companyId: "northwind digital",
      title: "Senior Frontend Engineer",
      description:
        "Join our platform team building the next generation of our customer dashboard using React and TypeScript. You'll work closely with design and product to ship features that thousands of users rely on daily.",
      url: "https://example.com/mock-jobs/senior-frontend-engineer",
      location: { city: "London", region: "Greater London", country: "UK", isRemote: false },
      salaryMin: 65000,
      salaryMax: 85000,
      salaryCurrency: "GBP",
      employmentType: "FULL_TIME",
      workMode: "HYBRID",
      postedAt: daysAgo(2),
    },
    {
      provider: "MOCK",
      externalId: "mock-2",
      companyId: "brightpath systems",
      title: "Backend Engineer (Node.js)",
      description:
        "We're looking for a backend engineer to help scale our order-processing services. Strong TypeScript and PostgreSQL experience preferred.",
      url: "https://example.com/mock-jobs/backend-engineer-nodejs",
      location: {
        city: "Manchester",
        region: "Greater Manchester",
        country: "UK",
        isRemote: false,
      },
      salaryMin: 55000,
      salaryMax: 70000,
      salaryCurrency: "GBP",
      employmentType: "FULL_TIME",
      workMode: "ONSITE",
      postedAt: daysAgo(5),
    },
    {
      provider: "MOCK",
      externalId: "mock-3",
      companyId: "cloudforge ltd",
      title: "Remote DevOps Engineer",
      description:
        "Fully remote contract role helping migrate our infrastructure to Kubernetes. UK-based applicants only, outside IR35.",
      url: "https://example.com/mock-jobs/remote-devops-engineer",
      location: { country: "UK", isRemote: true },
      employmentType: "CONTRACT",
      workMode: "REMOTE",
      postedAt: daysAgo(1),
    },
    {
      provider: "MOCK",
      externalId: "mock-4",
      companyId: "greenleaf software",
      title: "Junior Software Engineer",
      description:
        "A great first role for a recent graduate or bootcamp alumnus. You'll be mentored by senior engineers while contributing to real features from day one.",
      url: "https://example.com/mock-jobs/junior-software-engineer",
      location: { city: "Bristol", region: "South West England", country: "UK", isRemote: false },
      salaryMin: 32000,
      salaryMax: 40000,
      salaryCurrency: "GBP",
      employmentType: "FULL_TIME",
      workMode: "ONSITE",
      postedAt: daysAgo(9),
    },
  ];
}

function matchesKeywords(listing: JobProviderListing, keywords: string | undefined): boolean {
  if (!keywords) return true;
  const haystack = `${listing.title} ${listing.description}`.toLowerCase();
  return haystack.includes(keywords.toLowerCase());
}

function matchesLocation(listing: JobProviderListing, location: string | undefined): boolean {
  if (!location) return true;
  const haystack = `${listing.location.city ?? ""} ${listing.location.region ?? ""}`.toLowerCase();
  return haystack.includes(location.toLowerCase());
}

function matchesSalaryMin(listing: JobProviderListing, salaryMin: number | undefined): boolean {
  if (salaryMin === undefined) return true;
  // Unknown salary isn't excluded — we can't tell whether it would qualify.
  if (listing.salaryMax === undefined) return true;
  return listing.salaryMax >= salaryMin;
}

/**
 * Development-only fallback JobProvider: returns a small set of realistic,
 * fixed UK listings (lightly filtered by keywords/location/salaryMin)
 * instead of calling a real API. Wired in by createContainer() only when
 * NODE_ENV=development and no real job provider has credentials configured
 * — AdzunaJobProvider and ReedJobProvider are untouched by this.
 */
export class MockJobProvider implements JobProvider {
  readonly name = "MOCK";

  async search(params: JobProviderSearchParams): Promise<JobProviderListing[]> {
    return buildMockListings().filter(
      (listing) =>
        matchesKeywords(listing, params.keywords) &&
        matchesLocation(listing, params.location) &&
        matchesSalaryMin(listing, params.salaryMin),
    );
  }
}
