import { describe, expect, it } from "vitest";
import { Job } from "@/domain/entities/job";
import { Profile } from "@/domain/entities/profile";
import { Resume } from "@/domain/entities/resume";
import { Location } from "@/domain/value-objects/location";
import {
  JobNotFoundError,
  ProfileNotFoundError,
  ResumeNotFoundError,
} from "@/application/errors/application-errors";
import { GenerateCoverLetterUseCase } from "@/application/use-cases/generate-cover-letter.use-case";
import { FakeAiProvider } from "../fakes/fake-ai-provider";
import { InMemoryJobRepository } from "../fakes/in-memory-job-repository";
import { InMemoryProfileRepository } from "../fakes/in-memory-profile-repository";
import { InMemoryResumeRepository } from "../fakes/in-memory-resume-repository";

function seedAll() {
  const jobRepository = new InMemoryJobRepository();
  const profileRepository = new InMemoryProfileRepository();
  const resumeRepository = new InMemoryResumeRepository();

  jobRepository.seed(
    Job.create({
      id: "j1",
      companyId: "c1",
      provider: "ADZUNA",
      externalId: "j1",
      title: "Staff Engineer",
      description: "desc",
      url: "https://example.com/jobs/1",
      location: Location.create({ country: "UK", isRemote: true }),
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    }),
  );
  profileRepository.seed(Profile.create({ id: "p1", userId: "u1", updatedAt: new Date() }));
  resumeRepository.seed(
    Resume.create({
      id: "r1",
      profileId: "p1",
      label: "General",
      content: "content",
      isPrimary: true,
      createdAt: new Date(),
    }),
  );

  return { jobRepository, profileRepository, resumeRepository };
}

describe("GenerateCoverLetterUseCase", () => {
  it("returns generated content from the AI provider", async () => {
    const { jobRepository, profileRepository, resumeRepository } = seedAll();
    const useCase = new GenerateCoverLetterUseCase(
      jobRepository,
      profileRepository,
      resumeRepository,
      new FakeAiProvider(),
    );

    const result = await useCase.execute({ jobId: "j1", profileId: "p1", resumeId: "r1" });

    expect(result.content).toContain("Dear Hiring Manager");
    expect(result.modelVersion).toBe("fake-model-1");
  });

  it("throws if the job does not exist", async () => {
    const { profileRepository, resumeRepository } = seedAll();
    const useCase = new GenerateCoverLetterUseCase(
      new InMemoryJobRepository(),
      profileRepository,
      resumeRepository,
      new FakeAiProvider(),
    );

    await expect(useCase.execute({ jobId: "missing", profileId: "p1" })).rejects.toThrow(
      JobNotFoundError,
    );
  });

  it("throws if the profile does not exist", async () => {
    const { jobRepository, resumeRepository } = seedAll();
    const useCase = new GenerateCoverLetterUseCase(
      jobRepository,
      new InMemoryProfileRepository(),
      resumeRepository,
      new FakeAiProvider(),
    );

    await expect(useCase.execute({ jobId: "j1", profileId: "missing" })).rejects.toThrow(
      ProfileNotFoundError,
    );
  });

  it("throws if no resume can be resolved", async () => {
    const { jobRepository, profileRepository } = seedAll();
    const useCase = new GenerateCoverLetterUseCase(
      jobRepository,
      profileRepository,
      new InMemoryResumeRepository(),
      new FakeAiProvider(),
    );

    await expect(useCase.execute({ jobId: "j1", profileId: "p1" })).rejects.toThrow(
      ResumeNotFoundError,
    );
  });
});
