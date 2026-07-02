import { describe, expect, it } from "vitest";
import { InvalidApplicationStatusTransitionError } from "@/domain/errors/domain-errors";
import { APPLICATION_STATUSES, ApplicationStatus } from "@/domain/value-objects/application-status";

describe("ApplicationStatus", () => {
  it("allows the full forward funnel, one stage at a time", () => {
    let status = ApplicationStatus.create("SAVED");
    status = status.transitionTo("APPLIED");
    status = status.transitionTo("HR_SCREEN");
    status = status.transitionTo("TECHNICAL_INTERVIEW");
    status = status.transitionTo("FINAL_INTERVIEW");
    status = status.transitionTo("OFFER");

    expect(status.value).toBe("OFFER");
  });

  it("allows skipping stages forward", () => {
    const status = ApplicationStatus.create("APPLIED");
    expect(status.canTransitionTo("FINAL_INTERVIEW")).toBe(true);
    expect(status.canTransitionTo("OFFER")).toBe(true);
  });

  it("allows withdrawing from any non-terminal state", () => {
    for (const value of [
      "SAVED",
      "APPLIED",
      "HR_SCREEN",
      "TECHNICAL_INTERVIEW",
      "FINAL_INTERVIEW",
    ] as const) {
      expect(ApplicationStatus.create(value).canTransitionTo("WITHDRAWN")).toBe(true);
    }
  });

  it("rejects backward transitions", () => {
    const status = ApplicationStatus.create("TECHNICAL_INTERVIEW");
    expect(status.canTransitionTo("APPLIED")).toBe(false);
    expect(() => status.transitionTo("APPLIED")).toThrow(InvalidApplicationStatusTransitionError);
  });

  it("rejects SAVED skipping straight to an interview stage", () => {
    const status = ApplicationStatus.create("SAVED");
    expect(status.canTransitionTo("HR_SCREEN")).toBe(false);
  });

  it.each(["OFFER", "REJECTED", "WITHDRAWN"] as const)(
    "treats %s as terminal — no further transitions",
    (terminal) => {
      const status = ApplicationStatus.create(terminal);
      expect(status.isTerminal()).toBe(true);
      for (const target of APPLICATION_STATUSES) {
        expect(status.canTransitionTo(target)).toBe(false);
      }
    },
  );

  it("non-terminal states report isTerminal() as false", () => {
    for (const value of [
      "SAVED",
      "APPLIED",
      "HR_SCREEN",
      "TECHNICAL_INTERVIEW",
      "FINAL_INTERVIEW",
    ] as const) {
      expect(ApplicationStatus.create(value).isTerminal()).toBe(false);
    }
  });

  it("transitionTo error carries the attempted from/to", () => {
    const status = ApplicationStatus.create("OFFER");
    try {
      status.transitionTo("APPLIED");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidApplicationStatusTransitionError);
      const transitionError = error as InvalidApplicationStatusTransitionError;
      expect(transitionError.from).toBe("OFFER");
      expect(transitionError.to).toBe("APPLIED");
    }
  });
});
