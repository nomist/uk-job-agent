import { Profile } from "@/domain/entities/profile";
import { SalaryRange } from "@/domain/value-objects/salary-range";
import { WorkMode } from "@/domain/value-objects/work-mode";
import { Prisma } from "@/generated/prisma/client";

export function toDomainProfile(row: Prisma.ProfileModel): Profile {
  const hasSalary =
    row.salaryExpectationMin !== null &&
    row.salaryExpectationMax !== null &&
    row.salaryExpectationCurrency !== null;

  return Profile.create({
    id: row.id,
    userId: row.userId,
    headline: row.headline ?? undefined,
    yearsOfExperience: row.yearsOfExperience ?? undefined,
    skills: JSON.parse(row.skills) as string[],
    workPreferences: JSON.parse(row.workPreferences) as WorkMode[],
    visaStatus: row.visaStatus,
    salaryExpectation: hasSalary
      ? SalaryRange.create({
          min: row.salaryExpectationMin!,
          max: row.salaryExpectationMax!,
          currency: row.salaryExpectationCurrency!,
        })
      : undefined,
    updatedAt: row.updatedAt,
  });
}

/** Scalar row shape shared by both the create and update sides of an upsert. */
export function toProfileRow(profile: Profile) {
  return {
    userId: profile.userId,
    headline: profile.headline ?? null,
    yearsOfExperience: profile.yearsOfExperience ?? null,
    // string[] / WorkMode[] on the domain entity — SQLite has no native
    // array type, so these round-trip through a JSON-encoded string.
    skills: JSON.stringify(profile.skills),
    workPreferences: JSON.stringify(profile.workPreferences),
    visaStatus: profile.visaStatus,
    salaryExpectationMin: profile.salaryExpectation?.min ?? null,
    salaryExpectationMax: profile.salaryExpectation?.max ?? null,
    salaryExpectationCurrency: profile.salaryExpectation?.currency ?? null,
    updatedAt: profile.updatedAt,
  };
}
