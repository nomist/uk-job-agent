import { InvalidApplicationStatusTransitionError } from "@/domain/errors/domain-errors";

// Amends the Domain RFC's single "Interview" state into three sub-stages,
// per the Feature Spec's flagged required amendment (HR Screen / Technical /
// Final), so pipeline UI and analytics can report per-stage funnel data.
export const APPLICATION_STATUSES = [
  "SAVED",
  "APPLIED",
  "HR_SCREEN",
  "TECHNICAL_INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number];

const TERMINAL_STATUSES: ReadonlySet<ApplicationStatusValue> = new Set([
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
]);

// Forward-only funnel: a status may advance to any later stage (skipping
// stages is allowed — real hiring pipelines vary) or to a terminal state,
// but never move backward. Reverting a terminal state is an explicit,
// separate operation for a higher layer to model, not a domain transition.
const ALLOWED_TRANSITIONS: Record<ApplicationStatusValue, readonly ApplicationStatusValue[]> = {
  SAVED: ["APPLIED", "WITHDRAWN"],
  APPLIED: [
    "HR_SCREEN",
    "TECHNICAL_INTERVIEW",
    "FINAL_INTERVIEW",
    "OFFER",
    "REJECTED",
    "WITHDRAWN",
  ],
  HR_SCREEN: ["TECHNICAL_INTERVIEW", "FINAL_INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"],
  TECHNICAL_INTERVIEW: ["FINAL_INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"],
  FINAL_INTERVIEW: ["OFFER", "REJECTED", "WITHDRAWN"],
  OFFER: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export function isApplicationStatusValue(value: string): value is ApplicationStatusValue {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export class ApplicationStatus {
  private constructor(public readonly value: ApplicationStatusValue) {}

  static create(value: ApplicationStatusValue): ApplicationStatus {
    return new ApplicationStatus(value);
  }

  isTerminal(): boolean {
    return TERMINAL_STATUSES.has(this.value);
  }

  canTransitionTo(next: ApplicationStatusValue): boolean {
    return ALLOWED_TRANSITIONS[this.value].includes(next);
  }

  /** Returns the target status, or throws if the transition is not allowed. */
  transitionTo(next: ApplicationStatusValue): ApplicationStatus {
    if (!this.canTransitionTo(next)) {
      throw new InvalidApplicationStatusTransitionError(this.value, next);
    }
    return new ApplicationStatus(next);
  }

  equals(other: ApplicationStatus): boolean {
    return this.value === other.value;
  }
}
