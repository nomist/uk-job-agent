import { describe, expect, it } from "vitest";
import { Application } from "@/domain/entities/application";
import { InvalidApplicationStatusTransitionError } from "@/domain/errors/domain-errors";
import { ApplicationNotFoundError } from "@/application/errors/application-errors";
import { UpdateApplicationStatusUseCase } from "@/application/use-cases/update-application-status.use-case";
import { InMemoryApplicationRepository } from "../fakes/in-memory-application-repository";

describe("UpdateApplicationStatusUseCase", () => {
  it("transitions the application and persists the new state", async () => {
    const repository = new InMemoryApplicationRepository();
    const application = Application.create({
      id: "a1",
      userId: "u1",
      jobId: "j1",
      appliedAt: new Date(),
    });
    await repository.save(application);
    const useCase = new UpdateApplicationStatusUseCase(repository);

    const updated = await useCase.execute({ applicationId: "a1", status: "HR_SCREEN" });

    expect(updated.status.value).toBe("HR_SCREEN");
    expect((await repository.findById("a1"))?.status.value).toBe("HR_SCREEN");
  });

  it("throws if the application does not exist", async () => {
    const useCase = new UpdateApplicationStatusUseCase(new InMemoryApplicationRepository());

    await expect(
      useCase.execute({ applicationId: "missing", status: "HR_SCREEN" }),
    ).rejects.toThrow(ApplicationNotFoundError);
  });

  it("propagates the domain's illegal-transition error unchanged", async () => {
    const repository = new InMemoryApplicationRepository();
    const application = Application.create({
      id: "a1",
      userId: "u1",
      jobId: "j1",
      appliedAt: new Date(),
      status: "OFFER",
    });
    await repository.save(application);
    const useCase = new UpdateApplicationStatusUseCase(repository);

    await expect(useCase.execute({ applicationId: "a1", status: "APPLIED" })).rejects.toThrow(
      InvalidApplicationStatusTransitionError,
    );
  });
});
