import { describe, expect, it } from "vitest";
import { Resume } from "@/domain/entities/resume";
import { ResumeNotFoundError } from "@/application/errors/application-errors";
import { SetPrimaryResumeUseCase } from "@/application/use-cases/set-primary-resume.use-case";
import { InMemoryResumeRepository } from "../fakes/in-memory-resume-repository";

describe("SetPrimaryResumeUseCase", () => {
  it("marks the target resume primary and demotes the previous primary", async () => {
    const resumeRepository = new InMemoryResumeRepository();
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
    resumeRepository.seed(
      Resume.create({
        id: "r2",
        profileId: "p1",
        label: "Frontend",
        content: "content 2",
        isPrimary: false,
        createdAt: new Date(),
      }),
    );
    const useCase = new SetPrimaryResumeUseCase(resumeRepository);

    const updated = await useCase.execute({ resumeId: "r2" });

    expect(updated.isPrimary).toBe(true);
    const oldPrimary = await resumeRepository.findById("r1");
    expect(oldPrimary?.isPrimary).toBe(false);
  });

  it("is a no-op when the target is already primary", async () => {
    const resumeRepository = new InMemoryResumeRepository();
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
    const useCase = new SetPrimaryResumeUseCase(resumeRepository);

    const updated = await useCase.execute({ resumeId: "r1" });

    expect(updated.isPrimary).toBe(true);
  });

  it("leaves other profiles' primary resumes untouched", async () => {
    const resumeRepository = new InMemoryResumeRepository();
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
    resumeRepository.seed(
      Resume.create({
        id: "r2",
        profileId: "p2",
        label: "Other profile's resume",
        content: "content 2",
        isPrimary: false,
        createdAt: new Date(),
      }),
    );
    const useCase = new SetPrimaryResumeUseCase(resumeRepository);

    await useCase.execute({ resumeId: "r2" });

    const untouched = await resumeRepository.findById("r1");
    expect(untouched?.isPrimary).toBe(true);
  });

  it("throws ResumeNotFoundError for an unknown resume id", async () => {
    const useCase = new SetPrimaryResumeUseCase(new InMemoryResumeRepository());

    await expect(useCase.execute({ resumeId: "missing" })).rejects.toThrow(ResumeNotFoundError);
  });
});
