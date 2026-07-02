import { SavedJobRecord } from "@/application/dto/saved-job.dto";
import { SavedJobRepository } from "@/application/ports/saved-job-repository.port";

export class InMemorySavedJobRepository implements SavedJobRepository {
  private readonly records = new Map<string, SavedJobRecord>();

  private key(userId: string, jobId: string): string {
    return `${userId}:${jobId}`;
  }

  async findByUserAndJob(userId: string, jobId: string): Promise<SavedJobRecord | null> {
    return this.records.get(this.key(userId, jobId)) ?? null;
  }

  async save(record: SavedJobRecord): Promise<void> {
    this.records.set(this.key(record.userId, record.jobId), record);
  }

  all(): SavedJobRecord[] {
    return [...this.records.values()];
  }
}
