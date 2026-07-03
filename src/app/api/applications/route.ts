import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseJsonBody, parseQuery } from "@/app/api/_lib/parse-request";
import { toApplicationJson, toJobJson } from "@/app/api/_lib/serializers";
import { ensureDefaultResume } from "@/app/api/_lib/ensure-default-resume";
import { getContainer } from "@/lib/di/get-container";

const listApplicationsQuerySchema = z.object({
  userId: z.string().trim().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = parseQuery(new URL(request.url).searchParams, listApplicationsQuerySchema);

    const container = getContainer();
    const results = await container.listApplications().execute({ userId });

    return NextResponse.json({
      applications: results.map(({ application, job }) => ({
        application: toApplicationJson(application),
        job: toJobJson(job),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const createApplicationBodySchema = z.object({
  userId: z.string().trim().min(1),
  jobId: z.string().trim().min(1),
  // Optional: no resume-management UI exists yet, so the "Mark as applied"
  // action (Job Search / Saved Jobs) omits this and a default resume is
  // resolved server-side (see ensure-default-resume.ts). A caller that does
  // have a real resumeId can still pass one explicitly.
  resumeId: z.string().trim().min(1).optional(),
  appliedAt: z.coerce.date().optional(),
  notes: z.string().trim().min(1).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request, createApplicationBodySchema);

    const container = getContainer();
    const resumeId = body.resumeId ?? (await ensureDefaultResume(container, body.userId)).resumeId;
    const application = await container.createApplication().execute({ ...body, resumeId });

    return NextResponse.json({ application: toApplicationJson(application) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
