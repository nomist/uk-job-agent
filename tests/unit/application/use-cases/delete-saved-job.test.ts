import { describe, expect, it } from "vitest";
import { SavedJobNotFoundError } from "@/application/errors/application-errors";
import { DeleteSavedJobUseCase } from "@/application/use-cases/delete-saved-job.use-case";
import { InMemorySavedJobRepository } from "../fakes/in-memory-saved-job-repository";

describe("DeleteSavedJobUseCase", () => {
  it("deletes the record and it no longer appears for that user", async () => {
    const savedJobRepository = new InMemorySavedJobRepository();
    await savedJobRepository.save({
      id: "sj1",
      userId: "u1",
      jobId: "j1",
      status: "SAVED",
      savedAt: new Date(),
    });
    const useCase = new DeleteSavedJobUseCase(savedJobRepository);

    await useCase.execute({ savedJobId: "sj1" });

    expect(await savedJobRepository.findById("sj1")).toBeNull();
    expect(await savedJobRepository.findByUserId("u1")).toEqual([]);
  });

  it("throws SavedJobNotFoundError for an unknown id", async () => {
    const useCase = new DeleteSavedJobUseCase(new InMemorySavedJobRepository());

    await expect(useCase.execute({ savedJobId: "missing" })).rejects.toThrow(SavedJobNotFoundError);
  });

  it("does not affect other users' saved jobs", async () => {
    const savedJobRepository = new InMemorySavedJobRepository();
    await savedJobRepository.save({
      id: "sj1",
      userId: "u1",
      jobId: "j1",
      status: "SAVED",
      savedAt: new Date(),
    });
    await savedJobRepository.save({
      id: "sj2",
      userId: "u2",
      jobId: "j2",
      status: "SAVED",
      savedAt: new Date(),
    });
    const useCase = new DeleteSavedJobUseCase(savedJobRepository);

    await useCase.execute({ savedJobId: "sj1" });

    expect(await savedJobRepository.findById("sj2")).not.toBeNull();
  });
});
