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
    await this.prisma.profile.upsert({
      where: { id: profile.id },
      create: { id: profile.id, ...toProfileRow(profile) },
      update: toProfileRow(profile),
    });
  }
}
