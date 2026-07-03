import { Profile } from "@/domain/entities/profile";
import { ProfileRepository } from "@/application/ports/profile-repository.port";
import { PrismaClient } from "@/generated/prisma/client";
import { toDomainProfile, toProfileRow } from "./mappers/profile.mapper";

export class PrismaProfileRepository implements ProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Profile | null> {
    const row = await this.prisma.profile.findUnique({ where: { id } });
    return row ? toDomainProfile(row) : null;
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    const row = await this.prisma.profile.findUnique({ where: { userId } });
    return row ? toDomainProfile(row) : null;
  }

  async save(profile: Profile): Promise<void> {
    await this.ensureUserExists(profile.userId);
    await this.prisma.profile.upsert({
      where: { id: profile.id },
      create: { id: profile.id, ...toProfileRow(profile) },
      update: toProfileRow(profile),
    });
  }

  /**
   * Profile.userId is a real foreign key to User.id, but there's no
   * authentication yet — same gap as SavedJob.userId/Application.userId
   * (see PrismaSavedJobRepository/PrismaApplicationRepository), fixed the
   * same way: upsert a minimal placeholder User row keyed by that userId
   * so saving a profile never fails with a foreign key violation. Once
   * this Profile row exists, Resume.save() (which references Profile, not
   * User, directly) is never affected by this gap.
   */
  private async ensureUserExists(userId: string): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email: `${userId}@users.local` },
      update: {},
    });
  }
}
