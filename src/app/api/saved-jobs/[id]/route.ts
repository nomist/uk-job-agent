import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { getContainer } from "@/lib/di/get-container";

/**
 * Permanently removes a saved-job record — distinct from DELETE
 * /api/jobs/:id/save (which flips status to DISMISSED for the
 * recommendations engine's "don't show me this again" signal). See
 * DeleteSavedJobUseCase.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const container = getContainer();
    await container.deleteSavedJob().execute({ savedJobId: id });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
