import { ApplicationNotFoundError } from "@/application/errors/application-errors";
import { ApplicationRepository } from "@/application/ports/application-repository.port";

export interface DeleteApplicationInput {
  applicationId: string;
}

/** Removes only the Application (and its status history) — never the Job it points to, nor any Resume/Profile data. */
export class DeleteApplicationUseCase {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(input: DeleteApplicationInput): Promise<void> {
    const application = await this.applicationRepository.findById(input.applicationId);
    if (!application) throw new ApplicationNotFoundError(input.applicationId);

    await this.applicationRepository.delete(application.id);
  }
}
