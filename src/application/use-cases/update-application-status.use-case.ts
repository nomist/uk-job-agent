import { Application } from "@/domain/entities/application";
import { ApplicationStatusValue } from "@/domain/value-objects/application-status";
import { ApplicationNotFoundError } from "@/application/errors/application-errors";
import { ApplicationRepository } from "@/application/ports/application-repository.port";

export interface UpdateApplicationStatusInput {
  applicationId: string;
  status: ApplicationStatusValue;
  changedAt?: Date;
  note?: string;
}

/**
 * Illegal transitions surface as the domain's own
 * InvalidApplicationStatusTransitionError — the use case doesn't rewrap it.
 */
export class UpdateApplicationStatusUseCase {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: UpdateApplicationStatusInput): Promise<Application> {
    const application = await this.applicationRepository.findById(input.applicationId);
    if (!application) {
      throw new ApplicationNotFoundError(input.applicationId);
    }

    const updated = application.transitionTo(
      input.status,
      input.changedAt ?? this.now(),
      input.note,
    );
    await this.applicationRepository.save(updated);
    return updated;
  }
}
