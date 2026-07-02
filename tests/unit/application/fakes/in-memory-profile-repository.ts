import { Profile } from "@/domain/entities/profile";
import { ProfileRepository } from "@/application/ports/profile-repository.port";

export class InMemoryProfileRepository implements ProfileRepository {
  private readonly profiles = new Map<string, Profile>();

  async findById(id: string): Promise<Profile | null> {
    return this.profiles.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    for (const profile of this.profiles.values()) {
      if (profile.userId === userId) return profile;
    }
    return null;
  }

  async save(profile: Profile): Promise<void> {
    this.profiles.set(profile.id, profile);
  }

  seed(profile: Profile): void {
    this.profiles.set(profile.id, profile);
  }
}
