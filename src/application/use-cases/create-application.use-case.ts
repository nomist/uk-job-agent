import { randomUUID } from "node:crypto";
import { Application } from "@/domain/entities/application";
import {
  DuplicateActiveApplicationError,
  JobNotFoundError,
  ResumeNotFoundError,
} from "@/application/errors/application-errors";
import { ApplicationRepository } from "@/application/ports/application-repository.port";
import { JobRepository } from "@/application/ports/job-repository.port";
import { ResumeRepository } from "@/application/ports/resume-repository.port";

export interface CreateApplicationInput {
  userId: string;
  jobId: string;
  /** Required — the Feature Spec requires selecting a resume when marking a job Applied. */
  resumeId: string;
  appliedAt?: Date;
  notes?: string;
}

export class CreateApplicationUseCase {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly jobRepository: JobRepository,
    private readonly resumeRepository: ResumeRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: CreateApplicationInput): Promise<Application> {
    const job = await this.jobRepository.findById(input.jobId);
    if (!job) {
      throw new JobNotFoundError(input.jobId);
    }

    const resume = await this.resumeRepository.findById(input.resumeId);
    if (!resume) {
      throw new ResumeNotFoundError(input.resumeId);
    }

    const existing = await this.applicationRepository.findByUserAndJob(input.userId, input.jobId);
    if (existing?.isActive()) {
      throw new DuplicateActiveApplicationError(input.userId, input.jobId);
    }

    const application = Application.create({
      id: randomUUID(),
      userId: input.userId,
      jobId: input.jobId,
      resumeId: resume.id,
      appliedAt: input.appliedAt ?? this.now(),
      notes: input.notes,
    });

    await this.applicationRepository.save(application);
    return application;
  }
}
