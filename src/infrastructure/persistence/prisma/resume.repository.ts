import { Resume } from "@/domain/entities/resume";
import { ResumeInUseError } from "@/application/errors/application-errors";
import { ResumeRepository } from "@/application/ports/resume-repository.port";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { toDomainResume, toResumeRow } from "./mappers/resume.mapper";

/** SQLite's FK violation code, surfaced by Prisma as P2003 ("Foreign key constraint failed"). */
const FOREIGN_KEY_CONSTRAINT_CODE = "P2003";

export class PrismaResumeRepository implements ResumeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Resume | null> {
    const row = await this.prisma.resume.findUnique({ where: { id } });
    return row ? toDomainResume(row) : null;
  }

  async findPrimaryByProfileId(profileId: string): Promise<Resume | null> {
    const row = await this.prisma.resume.findFirst({ where: { profileId, isPrimary: true } });
    return row ? toDomainResume(row) : null;
  }

  async findByProfileId(profileId: string): Promise<Resume[]> {
    const rows = await this.prisma.resume.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDomainResume);
  }

  async save(resume: Resume): Promise<void> {
    await this.prisma.resume.upsert({
      where: { id: resume.id },
      create: { id: resume.id, ...toResumeRow(resume) },
      update: toResumeRow(resume),
    });
  }

  /**
   * MatchScore/RecommendationRun both reference Resume with ON DELETE
   * RESTRICT, so deleting a resume with related history hits a real FK
   * violation — translated here into a clear, actionable domain error
   * instead of a raw database error leaking out of this layer.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.resume.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_CONSTRAINT_CODE
      ) {
        throw new ResumeInUseError(id);
      }
      throw error;
    }
  }
}
