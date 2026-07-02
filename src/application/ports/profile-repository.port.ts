import { Profile } from "@/domain/entities/profile";

export interface ProfileRepository {
  findById(id: string): Promise<Profile | null>;
  findByUserId(userId: string): Promise<Profile | null>;
  save(profile: Profile): Promise<void>;
}
