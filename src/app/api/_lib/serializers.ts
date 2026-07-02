import { SavedJobRecord } from "@/application/dto/saved-job.dto";
import { Application } from "@/domain/entities/application";
import { Job } from "@/domain/entities/job";
import { MatchScore } from "@/domain/entities/match-score";

// Plain-JSON projections of domain entities / DTOs — Dates become ISO
// strings, value objects become plain objects. Kept alongside the route
// handlers rather than in domain/application, since "how an entity is
// shaped over the wire" is a UI/API-boundary concern, not a domain one.

export function toJobJson(job: Job) {
  return {
    id: job.id,
    companyId: job.companyId,
    provider: job.provider,
    externalId: job.externalId,
    title: job.title,
    description: job.description,
    location: {
      city: job.location.city ?? null,
      region: job.location.region ?? null,
      country: job.location.country,
      isRemote: job.location.isRemote,
    },
    url: job.url,
    salaryRange: job.salaryRange
      ? { min: job.salaryRange.min, max: job.salaryRange.max, currency: job.salaryRange.currency }
      : null,
    employmentType: job.employmentType ?? null,
    workMode: job.workMode ?? null,
    postedAt: job.postedAt?.toISOString() ?? null,
    firstSeenAt: job.firstSeenAt.toISOString(),
    lastSeenAt: job.lastSeenAt.toISOString(),
    isExpired: job.isExpired,
    canonicalJobId: job.canonicalJobId ?? null,
  };
}

export function toSavedJobJson(record: SavedJobRecord) {
  return {
    id: record.id,
    userId: record.userId,
    jobId: record.jobId,
    status: record.status,
    savedAt: record.savedAt.toISOString(),
    notes: record.notes ?? null,
  };
}

export function toApplicationJson(application: Application) {
  return {
    id: application.id,
    userId: application.userId,
    jobId: application.jobId,
    resumeId: application.resumeId ?? null,
    status: application.status.value,
    appliedAt: application.appliedAt.toISOString(),
    notes: application.notes ?? null,
    statusHistory: application.statusHistory.map((change) => ({
      from: change.from,
      to: change.to,
      changedAt: change.changedAt.toISOString(),
      note: change.note ?? null,
    })),
  };
}

export function toMatchScoreJson(matchScore: MatchScore) {
  return {
    id: matchScore.id,
    jobId: matchScore.jobId,
    profileId: matchScore.profileId,
    resumeId: matchScore.resumeId,
    score: matchScore.score,
    confidence: { value: matchScore.confidence.value, band: matchScore.confidence.band },
    rationale: matchScore.rationale,
    missingSkills: matchScore.missingSkills,
    modelVersion: matchScore.modelVersion,
    isLatest: matchScore.isLatest,
    generatedAt: matchScore.generatedAt.toISOString(),
  };
}
