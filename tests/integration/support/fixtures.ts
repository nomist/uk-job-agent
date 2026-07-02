import { randomUUID } from "node:crypto";
import { PrismaClient } from "@/generated/prisma/client";

// Direct Prisma writes for FK-dependent setup rows, kept deliberately
// decoupled from the repositories under test.

export async function createTestUser(prisma: PrismaClient, overrides: { email?: string } = {}) {
  return prisma.user.create({
    data: {
      id: randomUUID(),
      email: overrides.email ?? `${randomUUID()}@example.com`,
    },
  });
}

export async function createTestCompany(prisma: PrismaClient, overrides: { name?: string } = {}) {
  const name = overrides.name ?? `Test Co ${randomUUID()}`;
  return prisma.company.create({
    data: {
      id: randomUUID(),
      name,
      normalizedName: name.toLowerCase(),
    },
  });
}

export async function createTestJobRow(
  prisma: PrismaClient,
  companyId: string,
  overrides: Partial<{ provider: string; externalId: string }> = {},
) {
  return prisma.job.create({
    data: {
      id: randomUUID(),
      companyId,
      provider: overrides.provider ?? "ADZUNA",
      externalId: overrides.externalId ?? randomUUID(),
      title: "Staff Engineer",
      description: "Build things.",
      locationCountry: "UK",
      isRemote: true,
      url: "https://example.com/jobs/1",
    },
  });
}

export async function createTestProfileRow(prisma: PrismaClient, userId: string) {
  return prisma.profile.create({
    data: { id: randomUUID(), userId },
  });
}

export async function createTestResumeRow(
  prisma: PrismaClient,
  profileId: string,
  overrides: Partial<{ isPrimary: boolean; label: string }> = {},
) {
  return prisma.resume.create({
    data: {
      id: randomUUID(),
      profileId,
      label: overrides.label ?? "General",
      content: "Resume content",
      isPrimary: overrides.isPrimary ?? false,
    },
  });
}
