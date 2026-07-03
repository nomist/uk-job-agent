import { describe, expect, it } from "vitest";
import { Profile } from "@/domain/entities/profile";
import { CreateResumeUseCase } from "@/application/use-cases/create-resume.use-case";
import { InMemoryProfileRepository } from "../fakes/in-memory-profile-repository";
import { InMemoryResumeRepository } from "../fakes/in-memory-resume-repository";

describe("CreateResumeUseCase", () => {
  it("auto-creates a Profile when the user doesn't have one yet", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const resumeRepository = new InMemoryResumeRepository();
    const useCase = new CreateResumeUseCase(profileRepository, resumeRepository);

    const resume = await useCase.execute({ userId: "u1", label: "General", content: "content" });

    const profile = await profileRepository.findByUserId("u1");
    expect(profile).not.toBeNull();
    expect(resume.profileId).toBe(profile?.id);
  });

  it("reuses the existing Profile when one already exists", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const resumeRepository = new InMemoryResumeRepository();
    profileRepository.seed(Profile.create({ id: "p1", userId: "u1", updatedAt: new Date() }));
    const useCase = new CreateResumeUseCase(profileRepository, resumeRepository);

    const resume = await useCase.execute({ userId: "u1", label: "General", content: "content" });

    expect(resume.profileId).toBe("p1");
  });

  it("makes the first resume for a profile primary by default", async () => {
    const useCase = new CreateResumeUseCase(
      new InMemoryProfileRepository(),
      new InMemoryResumeRepository(),
    );

    const resume = await useCase.execute({ userId: "u1", label: "General", content: "content" });

    expect(resume.isPrimary).toBe(true);
  });

  it("does not make a second resume primary by default, and keeps the first one primary", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const resumeRepository = new InMemoryResumeRepository();
    const useCase = new CreateResumeUseCase(profileRepository, resumeRepository);

    const first = await useCase.execute({ userId: "u1", label: "General", content: "content" });
    const second = await useCase.execute({ userId: "u1", label: "Frontend", content: "content 2" });

    expect(second.isPrimary).toBe(false);
    const reloadedFirst = await resumeRepository.findById(first.id);
    expect(reloadedFirst?.isPrimary).toBe(true);
  });

  it("demotes the previous primary when isPrimary is explicitly requested for a new resume", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const resumeRepository = new InMemoryResumeRepository();
    const useCase = new CreateResumeUseCase(profileRepository, resumeRepository);

    const first = await useCase.execute({ userId: "u1", label: "General", content: "content" });
    const second = await useCase.execute({
      userId: "u1",
      label: "Frontend",
      content: "content 2",
      isPrimary: true,
    });

    expect(second.isPrimary).toBe(true);
    const reloadedFirst = await resumeRepository.findById(first.id);
    expect(reloadedFirst?.isPrimary).toBe(false);
  });
});
