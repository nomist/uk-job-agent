import { describe, expect, it } from "vitest";
import { Application } from "@/domain/entities/application";
import { ApplicationNotFoundError } from "@/application/errors/application-errors";
import { DeleteApplicationUseCase } from "@/application/use-cases/delete-application.use-case";
import { InMemoryApplicationRepository } from "../fakes/in-memory-application-repository";

describe("DeleteApplicationUseCase", () => {
  it("deletes the application", async () => {
    const applicationRepository = new InMemoryApplicationRepository();
    await applicationRepository.save(
      Application.create({
        id: "app1",
        userId: "u1",
        jobId: "j1",
        resumeId: "r1",
        appliedAt: new Date(),
      }),
    );
    const useCase = new DeleteApplicationUseCase(applicationRepository);

    await useCase.execute({ applicationId: "app1" });

    expect(await applicationRepository.findById("app1")).toBeNull();
  });

  it("throws ApplicationNotFoundError for an unknown id", async () => {
    const useCase = new DeleteApplicationUseCase(new InMemoryApplicationRepository());

    await expect(useCase.execute({ applicationId: "missing" })).rejects.toThrow(
      ApplicationNotFoundError,
    );
  });

  it("does not affect other applications", async () => {
    const applicationRepository = new InMemoryApplicationRepository();
    await applicationRepository.save(
      Application.create({
        id: "app1",
        userId: "u1",
        jobId: "j1",
        resumeId: "r1",
        appliedAt: new Date(),
      }),
    );
    await applicationRepository.save(
      Application.create({
        id: "app2",
        userId: "u1",
        jobId: "j2",
        resumeId: "r1",
        appliedAt: new Date(),
      }),
    );
    const useCase = new DeleteApplicationUseCase(applicationRepository);

    await useCase.execute({ applicationId: "app1" });

    expect(await applicationRepository.findById("app2")).not.toBeNull();
  });
});
