import { describe, expect, it } from "vitest";
import { Resume } from "@/domain/entities/resume";
import {
  CannotDeleteOnlyResumeError,
  ResumeNotFoundError,
} from "@/application/errors/application-errors";
import { DeleteResumeUseCase } from "@/application/use-cases/delete-resume.use-case";
import { InMemoryResumeRepository } from "../fakes/in-memory-resume-repository";

const now = new Date("2026-01-01T00:00:00Z");

describe("DeleteResumeUseCase", () => {
  it("throws ResumeNotFoundError for an unknown id", async () => {
    const useCase = new DeleteResumeUseCase(new InMemoryResumeRepository());

    await expect(useCase.execute({ resumeId: "missing" })).rejects.toThrow(ResumeNotFoundError);
  });

  it("rejects deleting a profile's only resume", async () => {
    const resumeRepository = new InMemoryResumeRepository();
    resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "p1",
        label: "General",
        content: "c",
        isPrimary: true,
        createdAt: now,
      }),
    );
    const useCase = new DeleteResumeUseCase(resumeRepository);

    await expect(useCase.execute({ resumeId: "r1" })).rejects.toThrow(CannotDeleteOnlyResumeError);
    expect(await resumeRepository.findById("r1")).not.toBeNull();
  });

  it("deletes a non-primary resume when others remain, without touching who's primary", async () => {
    const resumeRepository = new InMemoryResumeRepository();
    resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "p1",
        label: "Primary",
        content: "c1",
        isPrimary: true,
        createdAt: now,
      }),
    );
    resumeRepository.seed(
      Resume.create({
        id: "r2",
        profileId: "p1",
        label: "Old draft",
        content: "c2",
        isPrimary: false,
        createdAt: now,
      }),
    );
    const useCase = new DeleteResumeUseCase(resumeRepository);

    await useCase.execute({ resumeId: "r2" });

    expect(await resumeRepository.findById("r2")).toBeNull();
    expect((await resumeRepository.findById("r1"))?.isPrimary).toBe(true);
  });

  it("reassigns primary to the most recently created remaining resume when the primary is deleted", async () => {
    const resumeRepository = new InMemoryResumeRepository();
    resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "p1",
        label: "Primary (to delete)",
        content: "c1",
        isPrimary: true,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      }),
    );
    resumeRepository.seed(
      Resume.create({
        id: "r2",
        profileId: "p1",
        label: "Older",
        content: "c2",
        isPrimary: false,
        createdAt: new Date("2026-01-02T00:00:00Z"),
      }),
    );
    resumeRepository.seed(
      Resume.create({
        id: "r3",
        profileId: "p1",
        label: "Most recent",
        content: "c3",
        isPrimary: false,
        createdAt: new Date("2026-01-05T00:00:00Z"),
      }),
    );
    const useCase = new DeleteResumeUseCase(resumeRepository);

    await useCase.execute({ resumeId: "r1" });

    expect(await resumeRepository.findById("r1")).toBeNull();
    expect((await resumeRepository.findById("r3"))?.isPrimary).toBe(true);
    expect((await resumeRepository.findById("r2"))?.isPrimary).toBe(false);
  });

  it("never leaves a profile with more than one primary resume after reassignment", async () => {
    const resumeRepository = new InMemoryResumeRepository();
    resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "p1",
        label: "Primary",
        content: "c1",
        isPrimary: true,
        createdAt: now,
      }),
    );
    resumeRepository.seed(
      Resume.create({
        id: "r2",
        profileId: "p1",
        label: "Other",
        content: "c2",
        isPrimary: false,
        createdAt: now,
      }),
    );
    const useCase = new DeleteResumeUseCase(resumeRepository);

    await useCase.execute({ resumeId: "r1" });

    const remaining = await resumeRepository.findByProfileId("p1");
    expect(remaining.filter((resume) => resume.isPrimary)).toHaveLength(1);
  });

  it("does not affect another profile's resumes", async () => {
    const resumeRepository = new InMemoryResumeRepository();
    resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "p1",
        label: "A",
        content: "c1",
        isPrimary: true,
        createdAt: now,
      }),
    );
    resumeRepository.seed(
      Resume.create({
        id: "r2",
        profileId: "p1",
        label: "B",
        content: "c2",
        isPrimary: false,
        createdAt: now,
      }),
    );
    resumeRepository.seed(
      Resume.create({
        id: "r3",
        profileId: "p2",
        label: "Other profile",
        content: "c3",
        isPrimary: true,
        createdAt: now,
      }),
    );
    const useCase = new DeleteResumeUseCase(resumeRepository);

    await useCase.execute({ resumeId: "r2" });

    expect((await resumeRepository.findById("r3"))?.isPrimary).toBe(true);
  });
});
