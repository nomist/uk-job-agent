import { Job } from "@/domain/entities/job";
import { AiCvSuggestion } from "@/application/dto/ai-provider.dto";
import { JobNotFoundError, ResumeNotFoundError } from "@/application/errors/application-errors";
import { AiProvider } from "@/application/ports/ai-provider.port";
import { JobRepository } from "@/application/ports/job-repository.port";
import { ResumeRepository } from "@/application/ports/resume-repository.port";

export interface SuggestCvImprovementsInput {
  resumeId: string;
  /** General suggestions when omitted; job-targeted suggestions when given. */
  targetJobId?: string;
}

export interface SuggestCvImprovementsResult {
  suggestions: AiCvSuggestion[];
  modelVersion: string;
  generatedAt: Date;
}

/** Returns suggestions but does not persist them — see ScoreJobMatchUseCase for why. */
export class SuggestCVImprovementsUseCase {
  constructor(
    private readonly resumeRepository: ResumeRepository,
    private readonly jobRepository: JobRepository,
    private readonly aiProvider: AiProvider,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: SuggestCvImprovementsInput): Promise<SuggestCvImprovementsResult> {
    const resume = await this.resumeRepository.findById(input.resumeId);
    if (!resume) throw new ResumeNotFoundError(input.resumeId);

    let targetJob: Job | undefined;
    if (input.targetJobId) {
      const found = await this.jobRepository.findById(input.targetJobId);
      if (!found) throw new JobNotFoundError(input.targetJobId);
      targetJob = found;
    }

    const result = await this.aiProvider.suggestCvImprovements({ resume, targetJob });

    return {
      suggestions: result.suggestions,
      modelVersion: result.modelVersion,
      generatedAt: this.now(),
    };
  }
}
