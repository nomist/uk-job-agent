import { InvalidResumeError } from "@/domain/errors/domain-errors";

export interface ResumeProps {
  id: string;
  profileId: string;
  label: string;
  content: string;
  parsedSkills?: string[];
  isPrimary?: boolean;
  createdAt: Date;
}

/**
 * Immutable by design: there is no "update content" method. Per the Domain
 * RFC, editing a resume creates a new Resume version rather than mutating an
 * existing one — that policy is enforced by simply not exposing a mutator
 * here, not by a runtime check.
 */
export class Resume {
  private constructor(
    public readonly id: string,
    public readonly profileId: string,
    public readonly label: string,
    public readonly content: string,
    public readonly parsedSkills: readonly string[],
    public readonly isPrimary: boolean,
    public readonly createdAt: Date,
  ) {}

  static create(props: ResumeProps): Resume {
    const id = props.id.trim();
    const profileId = props.profileId.trim();
    const label = props.label.trim();
    const content = props.content.trim();

    if (id.length === 0) {
      throw new InvalidResumeError("Resume id must not be empty");
    }
    if (profileId.length === 0) {
      throw new InvalidResumeError("Resume profileId must not be empty");
    }
    if (label.length === 0) {
      throw new InvalidResumeError("Resume label must not be empty");
    }
    if (content.length === 0) {
      throw new InvalidResumeError("Resume content must not be empty");
    }

    return new Resume(
      id,
      profileId,
      label,
      content,
      props.parsedSkills ?? [],
      props.isPrimary ?? false,
      props.createdAt,
    );
  }

  /** Metadata-only flip, not a content edit — returns a new instance. */
  markAsPrimary(): Resume {
    return new Resume(
      this.id,
      this.profileId,
      this.label,
      this.content,
      this.parsedSkills,
      true,
      this.createdAt,
    );
  }

  unmarkAsPrimary(): Resume {
    return new Resume(
      this.id,
      this.profileId,
      this.label,
      this.content,
      this.parsedSkills,
      false,
      this.createdAt,
    );
  }
}
