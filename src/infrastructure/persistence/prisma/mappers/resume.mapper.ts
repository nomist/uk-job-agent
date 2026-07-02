import { Resume } from "@/domain/entities/resume";
import { Prisma } from "@/generated/prisma/client";

export function toDomainResume(row: Prisma.ResumeModel): Resume {
  return Resume.create({
    id: row.id,
    profileId: row.profileId,
    label: row.label,
    content: row.content,
    parsedSkills: JSON.parse(row.parsedSkills) as string[],
    isPrimary: row.isPrimary,
    createdAt: row.createdAt,
  });
}

/** Scalar row shape shared by both the create and update sides of an upsert. */
export function toResumeRow(resume: Resume) {
  return {
    profileId: resume.profileId,
    label: resume.label,
    content: resume.content,
    parsedSkills: JSON.stringify(resume.parsedSkills),
    isPrimary: resume.isPrimary,
    createdAt: resume.createdAt,
  };
}
