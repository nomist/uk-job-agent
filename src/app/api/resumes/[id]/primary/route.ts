import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { toResumeJson } from "@/app/api/_lib/serializers";
import { getContainer } from "@/lib/di/get-container";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const container = getContainer();
    const resume = await container.setPrimaryResume().execute({ resumeId: id });

    return NextResponse.json({ resume: toResumeJson(resume) });
  } catch (error) {
    return handleApiError(error);
  }
}
