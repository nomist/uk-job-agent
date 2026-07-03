import { Resume } from "@/domain/entities/resume";
import { ResumeRepository } from "@/application/ports/resume-repository.port";
import { PrismaClient } from "@/generated/prisma/client";
import { toDomainResume, toResumeRow } from "./mappers/resume.mapper";

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
}
