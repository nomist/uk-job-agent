import { SavedJobRecord } from "@/application/dto/saved-job.dto";
import { SavedJobRepository } from "@/application/ports/saved-job-repository.port";
import { PrismaClient } from "@/generated/prisma/client";
import { toDomainSavedJobRecord } from "./mappers/saved-job.mapper";

export class PrismaSavedJobRepository implements SavedJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserAndJob(userId: string, jobId: string): Promise<SavedJobRecord | null> {
    const row = await this.prisma.savedJob.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });
    return row ? toDomainSavedJobRecord(row) : null;
  }

  async save(record: SavedJobRecord): Promise<void> {
    await this.prisma.savedJob.upsert({
      where: { userId_jobId: { userId: record.userId, jobId: record.jobId } },
      create: {
        id: record.id,
        userId: record.userId,
        jobId: record.jobId,
        status: record.status,
        savedAt: record.savedAt,
        notes: record.notes ?? null,
      },
      update: {
        status: record.status,
        savedAt: record.savedAt,
        notes: record.notes ?? null,
      },
    });
  }
}
