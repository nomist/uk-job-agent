import { SavedJobRecord } from "@/application/dto/saved-job.dto";
import { SavedJobRepository } from "@/application/ports/saved-job-repository.port";

export class InMemorySavedJobRepository implements SavedJobRepository {
  private readonly records = new Map<string, SavedJobRecord>();

  private key(userId: string, jobId: string): string {
    return `${userId}:${jobId}`;
  }

  async findById(id: string): Promise<SavedJobRecord | null> {
    return [...this.records.values()].find((record) => record.id === id) ?? null;
  }

  async findByUserAndJob(userId: string, jobId: string): Promise<SavedJobRecord | null> {
    return this.records.get(this.key(userId, jobId)) ?? null;
  }

  async findByUserId(userId: string): Promise<SavedJobRecord[]> {
    return [...this.records.values()].filter((record) => record.userId === userId);
  }

  async save(record: SavedJobRecord): Promise<void> {
    this.records.set(this.key(record.userId, record.jobId), record);
  }

  async delete(id: string): Promise<void> {
    const record = await this.findById(id);
    if (record) this.records.delete(this.key(record.userId, record.jobId));
  }

  all(): SavedJobRecord[] {
    return [...this.records.values()];
  }
}
