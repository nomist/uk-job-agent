import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseJsonBody } from "@/app/api/_lib/parse-request";
import { toMatchScoreJson } from "@/app/api/_lib/serializers";
import { getContainer } from "@/lib/di/get-container";

const scoreJobBodySchema = z.object({
  profileId: z.string().trim().min(1),
  resumeId: z.string().trim().min(1).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(request, scoreJobBodySchema);

    const container = getContainer();
    const matchScore = await container
      .scoreJobMatch()
      .execute({ jobId: id, profileId: body.profileId, resumeId: body.resumeId });

    return NextResponse.json({ matchScore: toMatchScoreJson(matchScore) });
  } catch (error) {
    return handleApiError(error);
  }
}
