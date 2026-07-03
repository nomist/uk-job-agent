import { Resume } from "@/domain/entities/resume";
import { ResumeRepository } from "@/application/ports/resume-repository.port";

export class InMemoryResumeRepository implements ResumeRepository {
  private readonly resumes = new Map<string, Resume>();

  async findById(id: string): Promise<Resume | null> {
    return this.resumes.get(id) ?? null;
  }

  async findPrimaryByProfileId(profileId: string): Promise<Resume | null> {
    for (const resume of this.resumes.values()) {
      if (resume.profileId === profileId && resume.isPrimary) return resume;
    }
    return null;
  }

  async findByProfileId(profileId: string): Promise<Resume[]> {
    return [...this.resumes.values()].filter((resume) => resume.profileId === profileId);
  }

  async save(resume: Resume): Promise<void> {
    this.resumes.set(resume.id, resume);
  }

  seed(resume: Resume): void {
    this.resumes.set(resume.id, resume);
  }
}
