import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseJsonBody } from "@/app/api/_lib/parse-request";
import { toApplicationJson } from "@/app/api/_lib/serializers";
import { getContainer } from "@/lib/di/get-container";

const createApplicationBodySchema = z.object({
  userId: z.string().trim().min(1),
  jobId: z.string().trim().min(1),
  resumeId: z.string().trim().min(1),
  appliedAt: z.coerce.date().optional(),
  notes: z.string().trim().min(1).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request, createApplicationBodySchema);

    const container = getContainer();
    const application = await container.createApplication().execute(body);

    return NextResponse.json({ application: toApplicationJson(application) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
