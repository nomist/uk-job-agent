import { Job } from "@/domain/entities/job";
import { JobRepository } from "@/application/ports/job-repository.port";
import { PrismaClient } from "@/generated/prisma/client";
import { toDomainJob, toJobRow } from "./mappers/job.mapper";

export class PrismaJobRepository implements JobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Job | null> {
    const row = await this.prisma.job.findUnique({ where: { id } });
    return row ? toDomainJob(row) : null;
  }

  async findByProviderListing(provider: string, externalId: string): Promise<Job | null> {
    const row = await this.prisma.job.findUnique({
      where: { provider_externalId: { provider, externalId } },
    });
    return row ? toDomainJob(row) : null;
  }

  async save(job: Job): Promise<void> {
    await this.ensureCompaniesExist([job.companyId]);
    await this.prisma.job.upsert({
      where: { id: job.id },
      create: { id: job.id, ...toJobRow(job) },
      update: toJobRow(job),
    });
  }

  async saveMany(jobs: Job[]): Promise<void> {
    await this.ensureCompaniesExist(jobs.map((job) => job.companyId));
    await this.prisma.$transaction(
      jobs.map((job) =>
        this.prisma.job.upsert({
          where: { id: job.id },
          create: { id: job.id, ...toJobRow(job) },
          update: toJobRow(job),
        }),
      ),
    );
  }

  /**
   * Job.companyId is a real foreign key to Company.id, but no
   * CompanyRepository exists yet (see the Adzuna/Reed mapper decisions —
   * companyId is a normalized-name placeholder, not a resolved database
   * id). Without this, saving any job whose companyId doesn't already have
   * a matching Company row fails with a foreign key constraint violation —
   * which every provider hits on a real database, not just the mock one.
   * Upserting a minimal placeholder Company row (keyed by that same
   * companyId) is a stopgap until real company resolution/dedup lands.
   */
  private async ensureCompaniesExist(companyIds: string[]): Promise<void> {
    const uniqueCompanyIds = [...new Set(companyIds)];
    if (uniqueCompanyIds.length === 0) return;

    await this.prisma.$transaction(
      uniqueCompanyIds.map((companyId) => this.upsertPlaceholderCompany(companyId)),
    );
  }

  private upsertPlaceholderCompany(companyId: string) {
    return this.prisma.company.upsert({
      where: { id: companyId },
      create: { id: companyId, name: companyId, normalizedName: companyId },
      update: {},
    });
  }
}
