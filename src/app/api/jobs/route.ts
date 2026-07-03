import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseQuery } from "@/app/api/_lib/parse-request";
import { toJobJson } from "@/app/api/_lib/serializers";
import { getContainer } from "@/lib/di/get-container";

const searchJobsQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  salaryMin: z.coerce.number().int().nonnegative().optional(),
  // Any value other than the literal string "true" (including absent) means "no filter".
  remoteOnly: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  provider: z.string().trim().toUpperCase().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const query = parseQuery(new URL(request.url).searchParams, searchJobsQuerySchema);

    const container = getContainer();
    const providerNames = query.provider ? [query.provider] : undefined;
    const result = await container.searchJobs(providerNames).execute({
      keywords: query.q,
      location: query.location,
      salaryMin: query.salaryMin,
    });

    // remoteOnly has no equivalent in JobProviderSearchParams (Application
    // layer) — applied here as a response-side filter over already-mapped
    // Job entities, not as a use-case concern.
    const jobs = query.remoteOnly
      ? result.jobs.filter((job) => job.location.isRemote)
      : result.jobs;

    // Development-only fallback: createContainer() wires in MockJobProvider
    // (name "MOCK") when no real job provider has credentials configured.
    // Checking the provider name here — rather than adding an isMock
    // concept to the Application layer — keeps this purely a route/DI
    // concern, matching how providerNames filtering already works.
    const isMock = container.dependencies.jobProviders.some((provider) => provider.name === "MOCK");

    // Every provider actually configured (independent of this request's
    // ?provider= filter) — lets the UI distinguish "you have zero API keys
    // set up" from "this specific search genuinely found nothing".
    const configuredProviders = container.dependencies.jobProviders.map(
      (provider) => provider.name,
    );

    return NextResponse.json({
      jobs: jobs.map(toJobJson),
      totalListingsFound: result.totalListingsFound,
      isMock,
      configuredProviders,
      failedProviders: result.failedProviders,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
