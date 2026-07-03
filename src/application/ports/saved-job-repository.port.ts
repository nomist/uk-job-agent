import { SavedJobRecord } from "@/application/dto/saved-job.dto";

export interface SavedJobRepository {
  findById(id: string): Promise<SavedJobRecord | null>;
  findByUserAndJob(userId: string, jobId: string): Promise<SavedJobRecord | null>;
  /** All records (both SAVED and DISMISSED) for a user — callers filter by status. */
  findByUserId(userId: string): Promise<SavedJobRecord[]>;
  save(record: SavedJobRecord): Promise<void>;
  delete(id: string): Promise<void>;
}
