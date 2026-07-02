import { Profile } from "@/domain/entities/profile";
import { Resume } from "@/domain/entities/resume";
import type { Container } from "@/lib/di/container";

/**
 * CreateApplicationUseCase requires a real resumeId (the Feature Spec
 * requires selecting a resume when marking a job Applied — see its own
 * comment), but no resume-management UI/route exists yet. Mirrors the
 * Company/User foreign-key stopgaps elsewhere in this codebase: if the
 * caller didn't supply a resumeId, ensure this user has a Profile and a
 * primary Resume (creating clearly-labeled placeholders if not) so
 * "Mark as applied" isn't blocked, and return that resume's id.
 *
 * This lives at the HTTP boundary, not in CreateApplicationUseCase itself
 * — the use case's "resumeId is required" rule is a real, unchanged
 * business rule; this only fills in a sensible default for our own UI's
 * benefit, using existing repository methods (no new Application-layer
 * surface).
 */
export async function ensureDefaultResumeId(container: Container, userId: string): Promise<string> {
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
    return existingResume.id;
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
  return resume.id;
}
