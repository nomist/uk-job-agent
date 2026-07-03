import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { Job } from "@/domain/entities/job";
import { Profile } from "@/domain/entities/profile";
import { RecommendationItem, RecommendationRun } from "@/domain/entities/recommendation-run";
import { Resume } from "@/domain/entities/resume";
import { Location } from "@/domain/value-objects/location";
import { buildTestContainer, TestContainerHandles } from "./support/build-test-container";

let handles: TestContainerHandles;

vi.mock("@/lib/di/get-container", () => ({
  getContainer: () => handles.container,
}));

const { GET } = await import("@/app/api/dashboard/recommendations/route");

describe("GET /api/dashboard/recommendations", () => {
  it("returns status: no_profile when the user has no Profile yet", async () => {
    handles = buildTestContainer();

    const response = await GET(
      new NextRequest("http://localhost/api/dashboard/recommendations?userId=u1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("no_profile");
    expect(body.profile).toBeNull();
    expect(body.latestRun).toBeNull();
  });

  it("returns status: no_resume when the Profile has no primary Resume yet", async () => {
    handles = buildTestContainer();
    handles.profileRepository.seed(
      Profile.create({ id: "p1", userId: "u1", updatedAt: new Date() }),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/dashboard/recommendations?userId=u1"),
    );
    const body = await response.json();

    expect(body.status).toBe("no_resume");
    expect(body.profile).not.toBeNull();
    expect(body.latestRun).toBeNull();
  });

  it("returns status: ready with Profile-derived prefillFilters, and a null latestRun when none has run yet", async () => {
    handles = buildTestContainer();
    handles.profileRepository.seed(
      Profile.create({
        id: "p1",
        userId: "u1",
        updatedAt: new Date(),
        headline: "Backend Engineer",
        skills: ["TypeScript"],
        preferredLocations: ["London"],
      }),
    );
    handles.resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "p1",
        label: "Primary",
        content: "content",
        isPrimary: true,
        createdAt: new Date(),
      }),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/dashboard/recommendations?userId=u1"),
    );
    const body = await response.json();

    expect(body.status).toBe("ready");
    expect(body.prefillFilters.headline).toBe("Backend Engineer");
    expect(body.prefillFilters.locations).toEqual(["London"]);
    expect(body.maxJobsToScoreCap).toBe(20);
    expect(body.latestRun).toBeNull();
  });

  it("returns the latest saved run, hydrated with full job details", async () => {
    handles = buildTestContainer();
    handles.profileRepository.seed(
      Profile.create({ id: "p1", userId: "u1", updatedAt: new Date() }),
    );
    handles.resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "p1",
        label: "Primary",
        content: "content",
        isPrimary: true,
        createdAt: new Date(),
      }),
    );
    handles.jobRepository.seed(
      Job.create({
        id: "j1",
        companyId: "c1",
        provider: "ADZUNA",
        externalId: "e1",
        title: "Backend Engineer",
        description: "desc",
        url: "https://example.com/jobs/1",
        location: Location.create({ country: "UK", isRemote: true }),
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      }),
    );
    handles.recommendationRunRepository.seed(
      RecommendationRun.create({
        id: "run1",
        profileId: "p1",
        resumeId: "r1",
        createdAt: new Date("2026-01-15T00:00:00Z"),
        searchFilters: {
          skills: [],
          locations: [],
          workModes: [],
          visaStatus: "UNKNOWN",
          maxJobsToScore: 20,
        },
        rawResultCount: 10,
        candidateCount: 5,
        selectedForScoringCount: 3,
        scoredCount: 3,
        failedCount: 0,
        items: [RecommendationItem.create({ jobId: "j1", score: 88, reason: "Great fit" })],
      }),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/dashboard/recommendations?userId=u1"),
    );
    const body = await response.json();

    expect(body.status).toBe("ready");
    expect(body.latestRun.id).toBe("run1");
    expect(body.latestRun.scoredCount).toBe(3);
    expect(body.latestRun.items).toHaveLength(1);
    expect(body.latestRun.items[0].score).toBe(88);
    expect(body.latestRun.items[0].job.title).toBe("Backend Engineer");
  });

  it("never calls the AI provider (loading the Dashboard must not spend AI tokens)", async () => {
    handles = buildTestContainer();
    handles.profileRepository.seed(
      Profile.create({ id: "p1", userId: "u1", updatedAt: new Date() }),
    );
    handles.resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "p1",
        label: "Primary",
        content: "content",
        isPrimary: true,
        createdAt: new Date(),
      }),
    );

    await GET(new NextRequest("http://localhost/api/dashboard/recommendations?userId=u1"));

    expect(handles.aiProvider.scoreMatchCallCount).toBe(0);
  });

  it("returns 400 when userId is missing", async () => {
    handles = buildTestContainer();
    const response = await GET(new NextRequest("http://localhost/api/dashboard/recommendations"));
    expect(response.status).toBe(400);
  });
});
