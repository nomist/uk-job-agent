import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseJsonBody } from "@/app/api/_lib/parse-request";
import { getContainer } from "@/lib/di/get-container";

const cvSuggestionsBodySchema = z.object({
  resumeId: z.string().trim().min(1),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(request, cvSuggestionsBodySchema);

    const container = getContainer();
    const result = await container.suggestCvImprovements().execute({
      resumeId: body.resumeId,
      targetJobId: id,
    });

    return NextResponse.json({
      suggestions: result.suggestions,
      modelVersion: result.modelVersion,
      generatedAt: result.generatedAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
