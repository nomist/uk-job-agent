import { InvalidMatchScoreError } from "@/domain/errors/domain-errors";
import { ConfidenceScore } from "@/domain/value-objects/confidence-score";

export interface MatchScoreProps {
  id: string;
  jobId: string;
  profileId: string;
  resumeId: string;
  score: number;
  confidence: ConfidenceScore;
  rationale: string;
  modelVersion: string;
  generatedAt: Date;
  missingSkills?: string[];
  isLatest?: boolean;
}

export class MatchScore {
  private constructor(
    public readonly id: string,
    public readonly jobId: string,
    public readonly profileId: string,
    public readonly resumeId: string,
    public readonly score: number,
    public readonly confidence: ConfidenceScore,
    public readonly rationale: string,
    public readonly modelVersion: string,
    public readonly generatedAt: Date,
    public readonly missingSkills: readonly string[],
    public readonly isLatest: boolean,
  ) {}

  static create(props: MatchScoreProps): MatchScore {
    const id = props.id.trim();
    const jobId = props.jobId.trim();
    const profileId = props.profileId.trim();
    const resumeId = props.resumeId.trim();
    const rationale = props.rationale.trim();
    const modelVersion = props.modelVersion.trim();

    if (id.length === 0) throw new InvalidMatchScoreError("MatchScore id must not be empty");
    if (jobId.length === 0) throw new InvalidMatchScoreError("MatchScore jobId must not be empty");
    if (profileId.length === 0)
      throw new InvalidMatchScoreError("MatchScore profileId must not be empty");
    if (resumeId.length === 0)
      throw new InvalidMatchScoreError("MatchScore resumeId must not be empty");
    if (rationale.length === 0)
      throw new InvalidMatchScoreError("MatchScore rationale must not be empty");
    if (modelVersion.length === 0) {
      throw new InvalidMatchScoreError("MatchScore modelVersion must not be empty");
    }
    if (!Number.isInteger(props.score) || props.score < 0 || props.score > 100) {
      throw new InvalidMatchScoreError(
        `MatchScore score must be an integer 0-100, got ${props.score}`,
      );
    }

    return new MatchScore(
      id,
      jobId,
      profileId,
      resumeId,
      props.score,
      props.confidence,
      rationale,
      modelVersion,
      props.generatedAt,
      props.missingSkills ?? [],
      props.isLatest ?? true,
    );
  }

  /**
   * Used when a new MatchScore is generated for the same (jobId, resumeId):
   * the previous latest is flipped rather than mutated in place, preserving
   * score history as the resume improves (per the Domain RFC).
   */
  markSuperseded(): MatchScore {
    return new MatchScore(
      this.id,
      this.jobId,
      this.profileId,
      this.resumeId,
      this.score,
      this.confidence,
      this.rationale,
      this.modelVersion,
      this.generatedAt,
      this.missingSkills,
      false,
    );
  }
}
