import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseJsonBody, parseQuery } from "@/app/api/_lib/parse-request";
import { toResumeJson } from "@/app/api/_lib/serializers";
import { getContainer } from "@/lib/di/get-container";

const listResumesQuerySchema = z.object({
  userId: z.string().trim().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = parseQuery(new URL(request.url).searchParams, listResumesQuerySchema);

    const container = getContainer();
    const resumes = await container.listResumes().execute({ userId });

    return NextResponse.json({ resumes: resumes.map(toResumeJson) });
  } catch (error) {
    return handleApiError(error);
  }
}

const createResumeBodySchema = z.object({
  userId: z.string().trim().min(1),
  label: z.string().trim().min(1),
  content: z.string().trim().min(1),
  isPrimary: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request, createResumeBodySchema);

    const container = getContainer();
    const resume = await container.createResume().execute(body);

    return NextResponse.json({ resume: toResumeJson(resume) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
