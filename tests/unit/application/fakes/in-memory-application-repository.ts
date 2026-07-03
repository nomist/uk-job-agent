import { Application } from "@/domain/entities/application";
import { ApplicationRepository } from "@/application/ports/application-repository.port";

export class InMemoryApplicationRepository implements ApplicationRepository {
  private readonly applications = new Map<string, Application>();

  async findById(id: string): Promise<Application | null> {
    return this.applications.get(id) ?? null;
  }

  async findByUserAndJob(userId: string, jobId: string): Promise<Application | null> {
    for (const application of this.applications.values()) {
      if (application.userId === userId && application.jobId === jobId) return application;
    }
    return null;
  }

  async findByUserId(userId: string): Promise<Application[]> {
    return [...this.applications.values()].filter((application) => application.userId === userId);
  }

  async save(application: Application): Promise<void> {
    this.applications.set(application.id, application);
  }

  async delete(id: string): Promise<void> {
    this.applications.delete(id);
  }
}
