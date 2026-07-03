import { Profile } from "@/domain/entities/profile";
import { Resume } from "@/domain/entities/resume";
import type { Container } from "@/lib/di/container";

export interface DefaultResumeResult {
  profileId: string;
  resumeId: string;
}

/**
 * CreateApplicationUseCase, ScoreJobMatchUseCase, and
 * GenerateCoverLetterUseCase all require a real profileId/resumeId (the
 * Feature Spec requires selecting a resume for these flows — see
 * CreateApplicationUseCase's own comment), but no resume-management UI/route
 * exists yet. Mirrors the Company/User foreign-key stopgaps elsewhere in
 * this codebase: if the caller didn't supply one, ensure this user has a
 * Profile and a primary Resume (creating clearly-labeled placeholders if
 * not) so these actions aren't blocked, and return both ids.
 *
 * This lives at the HTTP boundary, not in the use cases themselves — each
 * use case's "profileId/resumeId is required" rule is a real, unchanged
 * business rule; this only fills in a sensible default for our own UI's
 * benefit, using existing repository methods (no new Application-layer
 * surface).
 */
export async function ensureDefaultResume(
  container: Container,
  userId: string,
): Promise<DefaultResumeResult> {
  const { profileRepository, resumeRepository } = container.dependencies;

  // Deterministic ids (not randomUUID()) — same reasoning as the Company/User
  // placeholder upserts: a repeat call for the same userId resolves to the
  // same row instead of racing to create a second one under Profile.userId's
  // unique constraint.
  const profileId = `${userId}-default-profile`;

  let profile = await profileRepository.findByUserId(userId);
  if (!profile) {
    profile = Profile.create({ id: profileId, userId, updatedAt: new Date() });
    await profileRepository.save(profile);
  }

  const existingResume = await resumeRepository.findPrimaryByProfileId(profile.id);
  if (existingResume) {
    return { profileId: profile.id, resumeId: existingResume.id };
  }

  const resume = Resume.create({
    id: `${userId}-default-resume`,
    profileId: profile.id,
    label: "Default resume",
    content: "Placeholder resume — replace once resume management is implemented.",
    isPrimary: true,
    createdAt: new Date(),
  });
  await resumeRepository.save(resume);
  return { profileId: profile.id, resumeId: resume.id };
}
