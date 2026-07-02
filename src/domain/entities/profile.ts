import { InvalidProfileError } from "@/domain/errors/domain-errors";
import { SalaryRange } from "@/domain/value-objects/salary-range";
import { VisaStatus } from "@/domain/value-objects/visa-status";
import { WorkMode } from "@/domain/value-objects/work-mode";

export interface ProfileProps {
  id: string;
  userId: string;
  headline?: string;
  yearsOfExperience?: number;
  skills?: string[];
  salaryExpectation?: SalaryRange;
  workPreferences?: WorkMode[];
  visaStatus?: VisaStatus;
  updatedAt: Date;
}

export class Profile {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly skills: readonly string[],
    public readonly workPreferences: readonly WorkMode[],
    public readonly visaStatus: VisaStatus,
    public readonly updatedAt: Date,
    public readonly headline?: string,
    public readonly yearsOfExperience?: number,
    public readonly salaryExpectation?: SalaryRange,
  ) {}

  static create(props: ProfileProps): Profile {
    const id = props.id.trim();
    const userId = props.userId.trim();

    if (id.length === 0) {
      throw new InvalidProfileError("Profile id must not be empty");
    }
    if (userId.length === 0) {
      throw new InvalidProfileError("Profile userId must not be empty");
    }
    if (props.yearsOfExperience !== undefined && props.yearsOfExperience < 0) {
      throw new InvalidProfileError("Profile yearsOfExperience cannot be negative");
    }

    return new Profile(
      id,
      userId,
      props.skills ?? [],
      props.workPreferences ?? [],
      props.visaStatus ?? "UNKNOWN",
      props.updatedAt,
      props.headline?.trim() || undefined,
      props.yearsOfExperience,
      props.salaryExpectation,
    );
  }

  /**
   * Soft readiness gate from the Domain RFC: match scoring is only offered
   * once at least one work mode is set — this is intentionally not a
   * creation-time invariant (a Profile can exist incomplete).
   */
  isEligibleForMatching(): boolean {
    return this.workPreferences.length > 0;
  }
}
