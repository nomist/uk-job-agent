import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/app/api/_lib/handle-api-error";
import { parseJsonBody } from "@/app/api/_lib/parse-request";
import { toApplicationJson } from "@/app/api/_lib/serializers";
import { APPLICATION_STATUSES } from "@/domain/value-objects/application-status";
import { getContainer } from "@/lib/di/get-container";

const updateStatusBodySchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
  changedAt: z.coerce.date().optional(),
  note: z.string().trim().min(1).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(request, updateStatusBodySchema);

    const container = getContainer();
    const application = await container.updateApplicationStatus().execute({
      applicationId: id,
      status: body.status,
      changedAt: body.changedAt,
      note: body.note,
    });

    return NextResponse.json({ application: toApplicationJson(application) });
  } catch (error) {
    return handleApiError(error);
  }
}
