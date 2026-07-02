// Doubles as the general per-user Job-state store (saved vs. dismissed):
// a dedicated "JobUserState" port wasn't requested this milestone, so
// SaveJobUseCase and DismissJobUseCase share this one record shape instead
// of introducing a second repository for what is otherwise the same relation.
export type SavedJobStatus = "SAVED" | "DISMISSED";

export interface SavedJobRecord {
  id: string;
  userId: string;
  jobId: string;
  status: SavedJobStatus;
  savedAt: Date;
  notes?: string;
}
