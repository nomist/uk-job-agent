import { Job } from "@/domain/entities/job";
import { Profile } from "@/domain/entities/profile";
import { Resume } from "@/domain/entities/resume";
import {
  AiCoverLetterRequest,
  AiCvSuggestionsRequest,
  AiMatchScoreRequest,
} from "@/application/dto/ai-provider.dto";
import { OpenAiChatMessage } from "./openai-types";

function describeJob(job: Job): string {
  return [
    `Title: ${job.title}`,
    `Location: ${job.location.describe()}`,
    job.salaryRange
      ? `Salary: ${job.salaryRange.min}-${job.salaryRange.max} ${job.salaryRange.currency}`
      : undefined,
    job.employmentType ? `Employment type: ${job.employmentType}` : undefined,
    job.workMode ? `Work mode: ${job.workMode}` : undefined,
    `Description: ${job.description}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function describeCandidate(profile: Profile, resume: Resume): string {
  return [
    profile.headline ? `Headline: ${profile.headline}` : undefined,
    profile.yearsOfExperience !== undefined
      ? `Years of experience: ${profile.yearsOfExperience}`
      : undefined,
    profile.skills.length > 0 ? `Skills: ${profile.skills.join(", ")}` : undefined,
    profile.salaryExpectation
      ? `Salary expectation: ${profile.salaryExpectation.min}-${profile.salaryExpectation.max} ${profile.salaryExpectation.currency}`
      : undefined,
    profile.workPreferences.length > 0
      ? `Work preferences: ${profile.workPreferences.join(", ")}`
      : undefined,
    `Visa status: ${profile.visaStatus}`,
    `Resume:\n${resume.content}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildMatchScorePrompt(request: AiMatchScoreRequest): OpenAiChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are a career-matching assistant for the UK job market. Assess how well a candidate fits a job posting. " +
        'Respond ONLY with a JSON object of the exact shape: {"score": integer 0-100, "confidence": number 0-1, "rationale": string, "strengths": string[], "weaknesses": string[], "missingSkills": string[]}. ' +
        '"strengths" and "weaknesses" should each be a short list of concrete points about the candidate\'s fit for this specific job. No prose outside the JSON.',
    },
    {
      role: "user",
      content: `Job:\n${describeJob(request.job)}\n\nCandidate:\n${describeCandidate(request.profile, request.resume)}`,
    },
  ];
}

export function buildCoverLetterPrompt(request: AiCoverLetterRequest): OpenAiChatMessage[] {
  const tone = request.tone ?? "FORMAL";

  return [
    {
      role: "system",
      content:
        `You are a career assistant writing a ${tone.toLowerCase()} cover letter for a UK job application. ` +
        'Respond ONLY with a JSON object of the exact shape: {"content": string}. No prose outside the JSON.',
    },
    {
      role: "user",
      content: `Job:\n${describeJob(request.job)}\n\nCandidate:\n${describeCandidate(request.profile, request.resume)}`,
    },
  ];
}

export function buildCvSuggestionsPrompt(request: AiCvSuggestionsRequest): OpenAiChatMessage[] {
  const targetJobSection = request.targetJob
    ? `\n\nTarget job:\n${describeJob(request.targetJob)}`
    : "";

  return [
    {
      role: "system",
      content:
        "You are a CV/resume improvement assistant for the UK job market. Suggest concrete improvements. " +
        'Respond ONLY with a JSON object of the exact shape: {"suggestions": [{"category": "MISSING_SKILLS"|"WORDING"|"STRUCTURE"|"OTHER", "text": string, "priority": "LOW"|"MEDIUM"|"HIGH"}]}. ' +
        'Use "MISSING_SKILLS" for skills/experience the resume lacks for the target job, "WORDING" for phrasing/impact improvements, "STRUCTURE" for layout/organization issues, and "OTHER" for anything else. No prose outside the JSON.',
    },
    {
      role: "user",
      content: `Resume:\n${request.resume.content}${targetJobSection}`,
    },
  ];
}
