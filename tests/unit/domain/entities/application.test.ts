import { describe, expect, it } from "vitest";
import { Application } from "@/domain/entities/application";
import { InvalidApplicationStatusTransitionError } from "@/domain/errors/domain-errors";

describe("Application", () => {
  const appliedAt = new Date("2026-01-01T00:00:00Z");

  const build = (overrides: Partial<Parameters<typeof Application.create>[0]> = {}) =>
    Application.create({ id: "a1", userId: "u1", jobId: "j1", appliedAt, ...overrides });

  it("defaults to APPLIED status with a seeded history entry", () => {
    const application = build();

    expect(application.status.value).toBe("APPLIED");
    expect(application.statusHistory).toEqual([
      { from: null, to: "APPLIED", changedAt: appliedAt },
    ]);
  });

  it("allows an explicit initial status", () => {
    const application = build({ status: "SAVED" });
    expect(application.status.value).toBe("SAVED");
  });

  it("transitionTo appends to history and returns a new instance", () => {
    const original = build();
    const changedAt = new Date("2026-01-05T00:00:00Z");

    const next = original.transitionTo("HR_SCREEN", changedAt, "Recruiter called");

    expect(next).not.toBe(original);
    expect(original.status.value).toBe("APPLIED");
    expect(next.status.value).toBe("HR_SCREEN");
    expect(next.statusHistory).toHaveLength(2);
    expect(next.statusHistory[1]).toEqual({
      from: "APPLIED",
      to: "HR_SCREEN",
      changedAt,
      note: "Recruiter called",
    });
  });

  it("rejects an illegal transition and leaves the application unchanged", () => {
    const application = build({ status: "OFFER" });

    expect(() => application.transitionTo("APPLIED", new Date())).toThrow(
      InvalidApplicationStatusTransitionError,
    );
    expect(application.status.value).toBe("OFFER");
    expect(application.statusHistory).toHaveLength(1);
  });

  describe("isActive", () => {
    it("is true for non-terminal statuses", () => {
      expect(build({ status: "TECHNICAL_INTERVIEW" }).isActive()).toBe(true);
    });

    it("is false for terminal statuses", () => {
      expect(build({ status: "REJECTED" }).isActive()).toBe(false);
    });
  });

  it("addNote does not alter status or history", () => {
    const application = build();
    const noted = application.addNote("Following up next week");

    expect(noted.notes).toBe("Following up next week");
    expect(noted.status.value).toBe(application.status.value);
    expect(noted.statusHistory).toEqual(application.statusHistory);
  });
});
