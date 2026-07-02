import { SavedJobRecord } from "@/application/dto/saved-job.dto";
import { Prisma } from "@/generated/prisma/client";

export function toDomainSavedJobRecord(row: Prisma.SavedJobModel): SavedJobRecord {
  return {
    id: row.id,
    userId: row.userId,
    jobId: row.jobId,
    status: row.status,
    savedAt: row.savedAt,
    notes: row.notes ?? undefined,
  };
}
