import { describe, expect, it } from "vitest";
import { Profile } from "@/domain/entities/profile";
import { InvalidProfileError } from "@/domain/errors/domain-errors";
import { UpsertProfileUseCase } from "@/application/use-cases/upsert-profile.use-case";
import { InMemoryProfileRepository } from "../fakes/in-memory-profile-repository";

describe("UpsertProfileUseCase", () => {
  it("creates a new profile when none exists for the user", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const useCase = new UpsertProfileUseCase(profileRepository);

    const profile = await useCase.execute({
      userId: "u1",
      headline: "Senior Engineer",
      yearsOfExperience: 5,
      skills: ["TypeScript", "React"],
      preferredLocations: ["London", "Remote"],
      workPreferences: ["REMOTE", "HYBRID"],
      visaStatus: "NO_SPONSORSHIP_NEEDED",
      salaryExpectation: { min: 60000, max: 80000, currency: "GBP" },
    });

    expect(profile.headline).toBe("Senior Engineer");
    expect(profile.skills).toEqual(["TypeScript", "React"]);
    expect(profile.preferredLocations).toEqual(["London", "Remote"]);
    expect(profile.workPreferences).toEqual(["REMOTE", "HYBRID"]);
    expect(profile.visaStatus).toBe("NO_SPONSORSHIP_NEEDED");
    expect(profile.salaryExpectation?.min).toBe(60000);
    expect(await profileRepository.findByUserId("u1")).not.toBeNull();
  });

  it("updates the existing profile in place (same id) rather than creating a second one", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const useCase = new UpsertProfileUseCase(profileRepository);

    const first = await useCase.execute({ userId: "u1", headline: "Junior Engineer" });
    const second = await useCase.execute({ userId: "u1", headline: "Senior Engineer" });

    expect(second.id).toBe(first.id);
    expect(second.headline).toBe("Senior Engineer");
  });

  it("supersedes a placeholder profile created by ensure-default-resume's deterministic id", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const useCase = new UpsertProfileUseCase(profileRepository);
    // Simulates the placeholder created by ensure-default-resume.ts.
    await profileRepository.save(
      Profile.create({
        id: "local-dev-user-default-profile",
        userId: "local-dev-user",
        updatedAt: new Date(),
      }),
    );

    const profile = await useCase.execute({ userId: "local-dev-user", headline: "Real headline" });

    expect(profile.id).toBe("local-dev-user-default-profile");
    expect(profile.headline).toBe("Real headline");
  });

  it("propagates InvalidProfileError for a negative years of experience", async () => {
    const useCase = new UpsertProfileUseCase(new InMemoryProfileRepository());

    await expect(useCase.execute({ userId: "u1", yearsOfExperience: -1 })).rejects.toThrow(
      InvalidProfileError,
    );
  });

  it("clearing an optional field on a re-save actually clears it (full replace, not merge)", async () => {
    const profileRepository = new InMemoryProfileRepository();
    const useCase = new UpsertProfileUseCase(profileRepository);

    await useCase.execute({ userId: "u1", skills: ["React"] });
    const second = await useCase.execute({ userId: "u1" });

    expect(second.skills).toEqual([]);
  });
});
