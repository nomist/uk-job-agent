import { Application } from "@/domain/entities/application";

export interface ApplicationRepository {
  findById(id: string): Promise<Application | null>;
  findByUserAndJob(userId: string, jobId: string): Promise<Application | null>;
  save(application: Application): Promise<void>;
}
