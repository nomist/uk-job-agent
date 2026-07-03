import { describe, expect, it } from "vitest";
import { Profile } from "@/domain/entities/profile";
import { Resume } from "@/domain/entities/resume";
import { ListResumesUseCase } from "@/application/use-cases/list-resumes.use-case";
import { InMemoryProfileRepository } from "../fakes/in-memory-profile-repository";
import { InMemoryResumeRepository } from "../fakes/in-memory-resume-repository";

describe("ListResumesUseCase", () => {
  it("returns an empty array when the user has no profile yet", async () => {
    const useCase = new ListResumesUseCase(
      new InMemoryProfileRepository(),
      new InMemoryResumeRepository(),
    );

    expect(await useCase.execute({ userId: "u1" })).toEqual([]);
  });

  it("returns all resumes for the user's profile", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const resumeRepository = new InMemoryResumeRepository();
    profileRepository.seed(Profile.create({ id: "p1", userId: "u1", updatedAt: new Date() }));
    resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "p1",
        label: "General",
        content: "content",
        createdAt: new Date(),
      }),
    );
    resumeRepository.seed(
      Resume.create({
        id: "r2",
        profileId: "p1",
        label: "Frontend-focused",
        content: "content 2",
        createdAt: new Date(),
      }),
    );
    const useCase = new ListResumesUseCase(profileRepository, resumeRepository);

    const results = await useCase.execute({ userId: "u1" });

    expect(results.map((resume) => resume.id).sort()).toEqual(["r1", "r2"]);
  });

  it("excludes another profile's resumes", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const resumeRepository = new InMemoryResumeRepository();
    profileRepository.seed(Profile.create({ id: "p1", userId: "u1", updatedAt: new Date() }));
    resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "someone-elses-profile",
        label: "General",
        content: "content",
        createdAt: new Date(),
      }),
    );
    const useCase = new ListResumesUseCase(profileRepository, resumeRepository);

    expect(await useCase.execute({ userId: "u1" })).toEqual([]);
  });
});
