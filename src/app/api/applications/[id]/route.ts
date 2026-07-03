import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { getContainer } from "@/lib/di/get-container";

/** Removes only the Application (and its status history) — never the Job or Resume it references. See DeleteApplicationUseCase. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const container = getContainer();
    await container.deleteApplication().execute({ applicationId: id });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
