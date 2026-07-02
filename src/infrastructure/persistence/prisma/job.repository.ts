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
    await this.prisma.job.upsert({
      where: { id: job.id },
      create: { id: job.id, ...toJobRow(job) },
      update: toJobRow(job),
    });
  }

  async saveMany(jobs: Job[]): Promise<void> {
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
}
