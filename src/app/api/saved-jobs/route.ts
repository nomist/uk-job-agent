import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseQuery } from "@/app/api/_lib/parse-request";
import { toJobJson, toSavedJobJson } from "@/app/api/_lib/serializers";
import { getContainer } from "@/lib/di/get-container";

const listSavedJobsQuerySchema = z.object({
  userId: z.string().trim().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = parseQuery(new URL(request.url).searchParams, listSavedJobsQuerySchema);

    const container = getContainer();
    const results = await container.listSavedJobs().execute({ userId });

    return NextResponse.json({
      savedJobs: results.map(({ savedJob, job }) => ({
        savedJob: toSavedJobJson(savedJob),
        job: toJobJson(job),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
