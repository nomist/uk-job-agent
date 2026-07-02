export abstract class ApplicationLayerError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class JobNotFoundError extends ApplicationLayerError {
  readonly code = "JOB_NOT_FOUND";

  constructor(jobId: string) {
    super(`Job "${jobId}" was not found`);
  }
}

export class ProfileNotFoundError extends ApplicationLayerError {
  readonly code = "PROFILE_NOT_FOUND";

  constructor(identifier: string) {
    super(`Profile "${identifier}" was not found`);
  }
}

export class ResumeNotFoundError extends ApplicationLayerError {
  readonly code = "RESUME_NOT_FOUND";

  constructor(identifier: string) {
    super(`Resume "${identifier}" was not found`);
  }
}

export class ApplicationNotFoundError extends ApplicationLayerError {
  readonly code = "APPLICATION_NOT_FOUND";

  constructor(applicationId: string) {
    super(`Application "${applicationId}" was not found`);
  }
}

export class DuplicateActiveApplicationError extends ApplicationLayerError {
  readonly code = "DUPLICATE_ACTIVE_APPLICATION";

  constructor(userId: string, jobId: string) {
    super(`User "${userId}" already has an active application for job "${jobId}"`);
  }
}
