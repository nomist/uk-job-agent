import { Application } from "@/domain/entities/application";
import { ApplicationRepository } from "@/application/ports/application-repository.port";
import { PrismaClient } from "@/generated/prisma/client";
import {
  toApplicationRow,
  toDomainApplication,
  toStatusChangeRows,
} from "./mappers/application.mapper";

export class PrismaApplicationRepository implements ApplicationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Application | null> {
    const row = await this.prisma.application.findUnique({
      where: { id },
      include: { statusChanges: true },
    });
    return row ? toDomainApplication(row) : null;
  }

  /**
   * No unique (userId, jobId) constraint exists in the schema:
   * CreateApplicationUseCase allows re-applying once a prior application for
   * the same pair reaches a terminal state, so more than one historical row
   * can match. This resolves the ambiguity flagged in the Milestone 4.1
   * schema notes by preferring the active application, falling back to the
   * most recently applied one.
   */
  async findByUserAndJob(userId: string, jobId: string): Promise<Application | null> {
    const rows = await this.prisma.application.findMany({
      where: { userId, jobId },
      include: { statusChanges: true },
      orderBy: { appliedAt: "desc" },
    });
    if (rows.length === 0) return null;

    const applications = rows.map(toDomainApplication);
    return applications.find((application) => application.isActive()) ?? applications[0];
  }

  /**
   * Upserts the Application row, then replaces its StatusChange rows
   * wholesale from `application.statusHistory` rather than diffing for new
   * entries — the domain entity always carries its full history, history
   * arrays are small (a handful of transitions), and this keeps create and
   * update paths identical instead of branching.
   */
  async save(application: Application): Promise<void> {
    const applicationRow = toApplicationRow(application);
    await this.prisma.$transaction([
      this.prisma.application.upsert({
        where: { id: application.id },
        create: { id: application.id, ...applicationRow },
        update: applicationRow,
      }),
      this.prisma.statusChange.deleteMany({ where: { applicationId: application.id } }),
      this.prisma.statusChange.createMany({ data: toStatusChangeRows(application) }),
    ]);
  }
}
