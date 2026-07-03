export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidSalaryRangeError extends DomainError {
  readonly code = "INVALID_SALARY_RANGE";
}

export class InvalidLocationError extends DomainError {
  readonly code = "INVALID_LOCATION";
}

export class InvalidConfidenceScoreError extends DomainError {
  readonly code = "INVALID_CONFIDENCE_SCORE";
}

export class InvalidApplicationStatusTransitionError extends DomainError {
  readonly code = "INVALID_APPLICATION_STATUS_TRANSITION";

  constructor(
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Cannot transition application status from "${from}" to "${to}"`);
  }
}

export class InvalidJobError extends DomainError {
  readonly code = "INVALID_JOB";
}

export class InvalidCompanyError extends DomainError {
  readonly code = "INVALID_COMPANY";
}

export class InvalidUserError extends DomainError {
  readonly code = "INVALID_USER";
}

export class InvalidProfileError extends DomainError {
  readonly code = "INVALID_PROFILE";
}

export class InvalidResumeError extends DomainError {
  readonly code = "INVALID_RESUME";
}

export class InvalidApplicationError extends DomainError {
  readonly code = "INVALID_APPLICATION";
}

export class InvalidMatchScoreError extends DomainError {
  readonly code = "INVALID_MATCH_SCORE";
}

export class InvalidRecommendationRunError extends DomainError {
  readonly code = "INVALID_RECOMMENDATION_RUN";
}

export class InvalidRecommendationItemError extends DomainError {
  readonly code = "INVALID_RECOMMENDATION_ITEM";
}
