import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseJsonBody } from "@/app/api/_lib/parse-request";
import { getContainer } from "@/lib/di/get-container";

const coverLetterBodySchema = z.object({
  profileId: z.string().trim().min(1),
  resumeId: z.string().trim().min(1).optional(),
  tone: z.enum(["FORMAL", "ENTHUSIASTIC", "CONCISE"]).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(request, coverLetterBodySchema);

    const container = getContainer();
    const result = await container.generateCoverLetter().execute({
      jobId: id,
      profileId: body.profileId,
      resumeId: body.resumeId,
      tone: body.tone,
    });

    return NextResponse.json({
      coverLetter: {
        content: result.content,
        modelVersion: result.modelVersion,
        generatedAt: result.generatedAt.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
