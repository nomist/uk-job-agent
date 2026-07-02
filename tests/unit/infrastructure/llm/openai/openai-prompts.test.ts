import { describe, expect, it } from "vitest";
import { Job } from "@/domain/entities/job";
import { Profile } from "@/domain/entities/profile";
import { Resume } from "@/domain/entities/resume";
import { Location } from "@/domain/value-objects/location";
import { SalaryRange } from "@/domain/value-objects/salary-range";
import {
  buildCoverLetterPrompt,
  buildCvSuggestionsPrompt,
  buildMatchScorePrompt,
} from "@/infrastructure/llm/openai/openai-prompts";

const job = Job.create({
  id: "j1",
  companyId: "c1",
  provider: "ADZUNA",
  externalId: "e1",
  title: "Staff Engineer",
  description: "Build great things.",
  url: "https://example.com/jobs/1",
  location: Location.create({ city: "London", country: "UK", isRemote: false }),
  firstSeenAt: new Date(),
  lastSeenAt: new Date(),
  salaryRange: SalaryRange.create({ min: 70000, max: 90000, currency: "GBP" }),
  employmentType: "FULL_TIME",
  workMode: "HYBRID",
});

const profile = Profile.create({
  id: "p1",
  userId: "u1",
  headline: "Senior engineer",
  yearsOfExperience: 8,
  skills: ["TypeScript", "React"],
  workPreferences: ["HYBRID"],
  salaryExpectation: SalaryRange.create({ min: 80000, max: 100000, currency: "GBP" }),
  visaStatus: "NO_SPONSORSHIP_NEEDED",
  updatedAt: new Date(),
});

const resume = Resume.create({
  id: "r1",
  profileId: "p1",
  label: "General",
  content: "10 years building web apps.",
  createdAt: new Date(),
});

describe("buildMatchScorePrompt", () => {
  it("includes a system message instructing a strict JSON shape", () => {
    const messages = buildMatchScorePrompt({ job, profile, resume });
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("score");
    expect(messages[0].content).toContain("JSON");
  });

  it("includes job and candidate details in the user message", () => {
    const messages = buildMatchScorePrompt({ job, profile, resume });
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toContain("Staff Engineer");
    expect(messages[1].content).toContain("TypeScript");
    expect(messages[1].content).toContain(resume.content);
  });
});

describe("buildCoverLetterPrompt", () => {
  it("reflects the requested tone in the system message", () => {
    const messages = buildCoverLetterPrompt({ job, profile, resume, tone: "ENTHUSIASTIC" });
    expect(messages[0].content.toLowerCase()).toContain("enthusiastic");
  });

  it("defaults to a formal tone when none is given", () => {
    const messages = buildCoverLetterPrompt({ job, profile, resume });
    expect(messages[0].content.toLowerCase()).toContain("formal");
  });
});

describe("buildCvSuggestionsPrompt", () => {
  it("includes only the resume when no target job is given", () => {
    const messages = buildCvSuggestionsPrompt({ resume });
    expect(messages[1].content).toContain(resume.content);
    expect(messages[1].content).not.toContain("Target job");
  });

  it("includes the target job when given", () => {
    const messages = buildCvSuggestionsPrompt({ resume, targetJob: job });
    expect(messages[1].content).toContain("Target job");
    expect(messages[1].content).toContain("Staff Engineer");
  });
});
