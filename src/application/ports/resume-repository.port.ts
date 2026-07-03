import { Resume } from "@/domain/entities/resume";

export interface ResumeRepository {
  findById(id: string): Promise<Resume | null>;
  findPrimaryByProfileId(profileId: string): Promise<Resume | null>;
  findByProfileId(profileId: string): Promise<Resume[]>;
  save(resume: Resume): Promise<void>;
}
