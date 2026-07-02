import { Application, ApplicationStatusChange } from "@/domain/entities/application";
import { ApplicationStatusValue } from "@/domain/value-objects/application-status";
import { Prisma } from "@/generated/prisma/client";

export type ApplicationRowWithHistory = Prisma.ApplicationModel & {
  statusChanges: Prisma.StatusChangeModel[];
};

/**
 * Application has no factory that accepts an arbitrary statusHistory array
 * (Application.create always seeds a single entry from `status`/`appliedAt`,
 * and further entries only come from transitionTo()). So reconstruction
 * replays the persisted history through create() + transitionTo() in order,
 * the same way the object was originally built — rather than adding a
 * back-door constructor path to the domain entity for this one caller.
 */
export function toDomainApplication(row: ApplicationRowWithHistory): Application {
  const history = [...row.statusChanges].sort(
    (a, b) => a.changedAt.getTime() - b.changedAt.getTime(),
  );

  if (history.length === 0) {
    return Application.create({
      id: row.id,
      userId: row.userId,
      jobId: row.jobId,
      appliedAt: row.appliedAt,
      resumeId: row.resumeId ?? undefined,
      notes: row.notes ?? undefined,
      status: row.currentStatus,
    });
  }

  const [seed, ...rest] = history;
  let application = Application.create({
    id: row.id,
    userId: row.userId,
    jobId: row.jobId,
    appliedAt: seed.changedAt,
    resumeId: row.resumeId ?? undefined,
    notes: row.notes ?? undefined,
    status: seed.toStatus as ApplicationStatusValue,
  });

  for (const change of rest) {
    application = application.transitionTo(
      change.toStatus as ApplicationStatusValue,
      change.changedAt,
      change.note ?? undefined,
    );
  }

  return application;
}

/**
 * Scalar row shape for the Application table itself. `coverLetterId` is not
 * included — no CoverLetter table/column exists yet (out of scope), so it
 * is not persisted; it always comes back undefined after a reload even if
 * set on the in-memory entity for the duration of a single use case call.
 */
export function toApplicationRow(application: Application) {
  return {
    userId: application.userId,
    jobId: application.jobId,
    resumeId: application.resumeId ?? null,
    currentStatus: application.status.value,
    appliedAt: application.appliedAt,
    notes: application.notes ?? null,
  };
}

export function toStatusChangeRows(application: Application) {
  return application.statusHistory.map((change: ApplicationStatusChange) => ({
    applicationId: application.id,
    fromStatus: change.from ?? null,
    toStatus: change.to,
    changedAt: change.changedAt,
    note: change.note ?? null,
  }));
}
