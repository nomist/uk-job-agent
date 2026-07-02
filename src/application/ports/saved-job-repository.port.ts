import { SavedJobRecord } from "@/application/dto/saved-job.dto";

export interface SavedJobRepository {
  findByUserAndJob(userId: string, jobId: string): Promise<SavedJobRecord | null>;
  save(record: SavedJobRecord): Promise<void>;
}
