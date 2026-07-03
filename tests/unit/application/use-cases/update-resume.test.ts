import { describe, expect, it } from "vitest";
import { Resume } from "@/domain/entities/resume";
import { InvalidResumeError } from "@/domain/errors/domain-errors";
import { ResumeNotFoundError } from "@/application/errors/application-errors";
import { UpdateResumeUseCase } from "@/application/use-cases/update-resume.use-case";
import { InMemoryResumeRepository } from "../fakes/in-memory-resume-repository";

const now = new Date("2026-01-01T00:00:00Z");

function seedResume(
  repo: InMemoryResumeRepository,
  overrides: Partial<Parameters<typeof Resume.create>[0]> = {},
) {
  const resume = Resume.create({
    id: "r1",
    profileId: "p1",
    label: "General",
    content: "Original content",
    parsedSkills: ["TypeScript"],
    isPrimary: true,
    createdAt: now,
    ...overrides,
  });
  repo.seed(resume);
  return resume;
}

describe("UpdateResumeUseCase", () => {
  it("throws ResumeNotFoundError for an unknown id", async () => {
    const useCase = new UpdateResumeUseCase(new InMemoryResumeRepository());

    await expect(useCase.execute({ resumeId: "missing", label: "New" })).rejects.toThrow(
      ResumeNotFoundError,
    );
  });

  it("updates label, content, and parsedSkills", async () => {
    const resumeRepository = new InMemoryResumeRepository();
    seedResume(resumeRepository);
    const useCase = new UpdateResumeUseCase(resumeRepository);

    const updated = await useCase.execute({
      resumeId: "r1",
      label: "Updated label",
      content: "Updated content",
      parsedSkills: ["Go", "Kubernetes"],
    });

    expect(updated.label).toBe("Updated label");
    expect(updated.content).toBe("Updated content");
    expect(updated.parsedSkills).toEqual(["Go", "Kubernetes"]);
  });

  it("leaves fields not included in the input unchanged", async () => {
    const resumeRepository = new InMemoryResumeRepository();
    seedResume(resumeRepository);
    const useCase = new UpdateResumeUseCase(resumeRepository);

    const updated = await useCase.execute({ resumeId: "r1", label: "Only label changed" });

    expect(updated.label).toBe("Only label changed");
    expect(updated.content).toBe("Original content");
    expect(updated.parsedSkills).toEqual(["TypeScript"]);
  });

  it("preserves id, profileId, isPrimary, and createdAt", async () => {
    const resumeRepository = new InMemoryResumeRepository();
    seedResume(resumeRepository);
    const useCase = new UpdateResumeUseCase(resumeRepository);

    const updated = await useCase.execute({ resumeId: "r1", label: "New label" });

    expect(updated.id).toBe("r1");
    expect(updated.profileId).toBe("p1");
    expect(updated.isPrimary).toBe(true);
    expect(updated.createdAt).toEqual(now);
  });

  it("persists the update so a fresh read reflects it", async () => {
    const resumeRepository = new InMemoryResumeRepository();
    seedResume(resumeRepository);
    const useCase = new UpdateResumeUseCase(resumeRepository);

    await useCase.execute({ resumeId: "r1", content: "Persisted content" });

    expect((await resumeRepository.findById("r1"))?.content).toBe("Persisted content");
  });

  it("rejects an update that would leave the resume with an empty label", async () => {
    const resumeRepository = new InMemoryResumeRepository();
    seedResume(resumeRepository);
    const useCase = new UpdateResumeUseCase(resumeRepository);

    await expect(useCase.execute({ resumeId: "r1", label: "   " })).rejects.toThrow(
      InvalidResumeError,
    );
  });
});
