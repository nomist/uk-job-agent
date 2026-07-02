import { Job } from "@/domain/entities/job";
import { Location } from "@/domain/value-objects/location";
import { SalaryRange } from "@/domain/value-objects/salary-range";
import { Prisma } from "@/generated/prisma/client";

export function toDomainJob(row: Prisma.JobModel): Job {
  const hasSalary = row.salaryMin !== null && row.salaryMax !== null && row.salaryCurrency !== null;

  return Job.create({
    id: row.id,
    companyId: row.companyId,
    provider: row.provider,
    externalId: row.externalId,
    title: row.title,
    description: row.description,
    location: Location.create({
      city: row.locationCity ?? undefined,
      region: row.locationRegion ?? undefined,
      country: row.locationCountry,
      isRemote: row.isRemote,
    }),
    url: row.url,
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
    isExpired: row.isExpired,
    salaryRange: hasSalary
      ? SalaryRange.create({
          min: row.salaryMin!,
          max: row.salaryMax!,
          currency: row.salaryCurrency!,
        })
      : undefined,
    employmentType: row.employmentType ?? undefined,
    workMode: row.workMode ?? undefined,
    postedAt: row.postedAt ?? undefined,
    canonicalJobId: row.canonicalJobId ?? undefined,
  });
}

/** Scalar row shape shared by both the create and update sides of an upsert. */
export function toJobRow(job: Job) {
  return {
    companyId: job.companyId,
    provider: job.provider,
    externalId: job.externalId,
    title: job.title,
    description: job.description,
    locationCity: job.location.city ?? null,
    locationRegion: job.location.region ?? null,
    locationCountry: job.location.country,
    isRemote: job.location.isRemote,
    salaryMin: job.salaryRange?.min ?? null,
    salaryMax: job.salaryRange?.max ?? null,
    salaryCurrency: job.salaryRange?.currency ?? null,
    employmentType: job.employmentType ?? null,
    workMode: job.workMode ?? null,
    url: job.url,
    postedAt: job.postedAt ?? null,
    firstSeenAt: job.firstSeenAt,
    lastSeenAt: job.lastSeenAt,
    isExpired: job.isExpired,
    canonicalJobId: job.canonicalJobId ?? null,
  };
}
