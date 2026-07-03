import { SavedJobRecord } from "@/application/dto/saved-job.dto";
import { SavedJobRepository } from "@/application/ports/saved-job-repository.port";
import { PrismaClient } from "@/generated/prisma/client";
import { toDomainSavedJobRecord } from "./mappers/saved-job.mapper";

export class PrismaSavedJobRepository implements SavedJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<SavedJobRecord | null> {
    const row = await this.prisma.savedJob.findUnique({ where: { id } });
    return row ? toDomainSavedJobRecord(row) : null;
  }

  async findByUserAndJob(userId: string, jobId: string): Promise<SavedJobRecord | null> {
    const row = await this.prisma.savedJob.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });
    return row ? toDomainSavedJobRecord(row) : null;
  }

  async findByUserId(userId: string): Promise<SavedJobRecord[]> {
    const rows = await this.prisma.savedJob.findMany({ where: { userId } });
    return rows.map(toDomainSavedJobRecord);
  }

  async save(record: SavedJobRecord): Promise<void> {
    await this.ensureUserExists(record.userId);
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

  async delete(id: string): Promise<void> {
    await this.prisma.savedJob.delete({ where: { id } });
  }

  /**
   * SavedJob.userId is a real foreign key to User.id, but there's no
   * authentication yet (see current-user.ts in the UI) — callers pass an
   * opaque userId string that may not correspond to any existing User row.
   * Same category of gap as Job.companyId (see PrismaJobRepository) and
   * the same stopgap fix: upsert a minimal placeholder User row keyed by
   * that userId, so saving a job never fails with a foreign key violation.
   * A real auth/user-provisioning flow should replace this.
   */
  private async ensureUserExists(userId: string): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email: `${userId}@users.local` },
      update: {},
    });
  }
}
