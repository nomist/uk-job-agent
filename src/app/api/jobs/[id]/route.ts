import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { toJobJson } from "@/app/api/_lib/serializers";
import { JobNotFoundError } from "@/application/errors/application-errors";
import { getContainer } from "@/lib/di/get-container";

// A single findById lookup has no orchestration/business rules to justify a
// dedicated use case (unlike ListSavedJobsUseCase/ListApplicationsUseCase,
// which enrich and filter) — the route reads the repository directly via
// the container, the same way GET /api/jobs already reads
// dependencies.jobProviders for its isMock check.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const container = getContainer();
    const job = await container.dependencies.jobRepository.findById(id);
    if (!job) throw new JobNotFoundError(id);

    return NextResponse.json({ job: toJobJson(job) });
  } catch (error) {
    return handleApiError(error);
  }
}
