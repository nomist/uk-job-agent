import { InvalidApplicationError } from "@/domain/errors/domain-errors";
import {
  ApplicationStatus,
  ApplicationStatusValue,
} from "@/domain/value-objects/application-status";

export interface ApplicationStatusChange {
  readonly from: ApplicationStatusValue | null;
  readonly to: ApplicationStatusValue;
  readonly changedAt: Date;
  readonly note?: string;
}

export interface ApplicationProps {
  id: string;
  userId: string;
  jobId: string;
  appliedAt: Date;
  resumeId?: string;
  coverLetterId?: string;
  status?: ApplicationStatusValue;
  notes?: string;
}

/**
 * Owns its own status-change history (the StatusChange concept from the
 * Domain RFC) as a plain readonly list rather than a separate top-level
 * entity — it has no meaning or lifecycle outside a single Application.
 */
export class Application {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly jobId: string,
    public readonly appliedAt: Date,
    public readonly status: ApplicationStatus,
    public readonly statusHistory: readonly ApplicationStatusChange[],
    public readonly resumeId?: string,
    public readonly coverLetterId?: string,
    public readonly notes?: string,
  ) {}

  static create(props: ApplicationProps): Application {
    const id = props.id.trim();
    const userId = props.userId.trim();
    const jobId = props.jobId.trim();

    if (id.length === 0) throw new InvalidApplicationError("Application id must not be empty");
    if (userId.length === 0)
      throw new InvalidApplicationError("Application userId must not be empty");
    if (jobId.length === 0)
      throw new InvalidApplicationError("Application jobId must not be empty");

    const initialStatus = props.status ?? "APPLIED";

    return new Application(
      id,
      userId,
      jobId,
      props.appliedAt,
      ApplicationStatus.create(initialStatus),
      [{ from: null, to: initialStatus, changedAt: props.appliedAt }],
      props.resumeId?.trim() || undefined,
      props.coverLetterId?.trim() || undefined,
      props.notes,
    );
  }

  /** Throws InvalidApplicationStatusTransitionError if the move isn't allowed. */
  transitionTo(next: ApplicationStatusValue, changedAt: Date, note?: string): Application {
    const nextStatus = this.status.transitionTo(next);

    return new Application(
      this.id,
      this.userId,
      this.jobId,
      this.appliedAt,
      nextStatus,
      [...this.statusHistory, { from: this.status.value, to: next, changedAt, note }],
      this.resumeId,
      this.coverLetterId,
      this.notes,
    );
  }

  isActive(): boolean {
    return !this.status.isTerminal();
  }

  addNote(note: string): Application {
    return new Application(
      this.id,
      this.userId,
      this.jobId,
      this.appliedAt,
      this.status,
      this.statusHistory,
      this.resumeId,
      this.coverLetterId,
      note,
    );
  }
}
