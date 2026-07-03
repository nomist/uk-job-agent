import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { Profile } from "@/domain/entities/profile";
import { Resume } from "@/domain/entities/resume";
import { JobProviderListing } from "@/application/dto/job-provider.dto";
import { buildTestContainer, TestContainerHandles } from "./support/build-test-container";
import { FakeJobProvider } from "../../../unit/application/fakes/fake-job-provider";

let handles: TestContainerHandles;

vi.mock("@/lib/di/get-container", () => ({
  getContainer: () => handles.container,
}));

const { POST } = await import("@/app/api/dashboard/recommendations/refresh/route");

const baseListing = (overrides: Partial<JobProviderListing> = {}): JobProviderListing => ({
  provider: "ADZUNA",
  externalId: "ext-1",
  companyId: "c1",
  title: "Backend Engineer",
  description: "Build APIs with TypeScript.",
  url: "https://example.com/jobs/1",
  location: { city: "London", country: "UK", isRemote: false },
  ...overrides,
});

function seedProfileAndResume(target: TestContainerHandles) {
  target.profileRepository.seed(
    Profile.create({
      id: "p1",
      userId: "u1",
      updatedAt: new Date(),
      headline: "Backend Engineer",
      skills: ["TypeScript"],
    }),
  );
  target.resumeRepository.seed(
    Resume.create({
      id: "r1",
      profileId: "p1",
      label: "Primary",
      content: "content",
      isPrimary: true,
      createdAt: new Date(),
    }),
  );
}

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/dashboard/recommendations/refresh", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/dashboard/recommendations/refresh", () => {
  it("returns 404 when the user has no Profile", async () => {
    handles = buildTestContainer();

    const response = await POST(jsonRequest({ userId: "missing-user" }));

    expect(response.status).toBe(404);
  });

  it("returns 404 when the Profile has no primary Resume", async () => {
    handles = buildTestContainer();
    handles.profileRepository.seed(
      Profile.create({ id: "p1", userId: "u1", updatedAt: new Date() }),
    );

    const response = await POST(jsonRequest({ userId: "u1" }));

    expect(response.status).toBe(404);
  });

  it("only calls the AI provider once this route is hit (never on its own)", async () => {
    handles = buildTestContainer({
      jobProviders: [new FakeJobProvider("ADZUNA", [baseListing()])],
    });
    seedProfileAndResume(handles);

    expect(handles.aiProvider.scoreMatchCallCount).toBe(0);

    const response = await POST(jsonRequest({ userId: "u1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(handles.aiProvider.scoreMatchCallCount).toBe(1);
    expect(body.run.scoredCount).toBe(1);
    expect(body.run.items).toHaveLength(1);
    expect(body.run.items[0].job.title).toBe("Backend Engineer");
  });

  it("enforces the maxJobsToScore cap on the number of AI calls made", async () => {
    handles = buildTestContainer({
      jobProviders: [
        new FakeJobProvider("ADZUNA", [
          baseListing({ externalId: "a" }),
          baseListing({ externalId: "b" }),
          baseListing({ externalId: "c" }),
          baseListing({ externalId: "d" }),
        ]),
      ],
    });
    seedProfileAndResume(handles);

    const response = await POST(jsonRequest({ userId: "u1", filters: { maxJobsToScore: 2 } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(handles.aiProvider.scoreMatchCallCount).toBe(2);
    expect(body.run.selectedForScoringCount).toBe(2);
    expect(body.run.candidateCount).toBe(4);
  });

  it("never exceeds the hard cap of 20, even if a caller requests more", async () => {
    handles = buildTestContainer({
      jobProviders: [new FakeJobProvider("ADZUNA", [baseListing()])],
    });
    seedProfileAndResume(handles);

    const response = await POST(jsonRequest({ userId: "u1", filters: { maxJobsToScore: 500 } }));
    const body = await response.json();

    expect(body.run.searchFilters.maxJobsToScore).toBe(20);
  });

  it("surfaces a partial AI scoring failure without failing the whole request", async () => {
    handles = buildTestContainer({
      jobProviders: [
        new FakeJobProvider("ADZUNA", [
          baseListing({ externalId: "ok" }),
          baseListing({ externalId: "fails" }),
        ]),
      ],
    });
    seedProfileAndResume(handles);
    handles.aiProvider.scoreMatchImpl = async (request) => {
      if (request.job.externalId === "fails") throw new Error("OpenAI rate limit exceeded");
      return handles.aiProvider.scoreMatchResponse;
    };

    const response = await POST(jsonRequest({ userId: "u1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.run.scoredCount).toBe(1);
    expect(body.run.failedCount).toBe(1);
    expect(body.run.items).toHaveLength(1);
  });

  it("reuses a recent score on a second refresh instead of calling the AI provider again", async () => {
    handles = buildTestContainer({
      jobProviders: [new FakeJobProvider("ADZUNA", [baseListing()])],
    });
    seedProfileAndResume(handles);

    await POST(jsonRequest({ userId: "u1" }));
    expect(handles.aiProvider.scoreMatchCallCount).toBe(1);

    await POST(jsonRequest({ userId: "u1" }));
    expect(handles.aiProvider.scoreMatchCallCount).toBe(1);
  });

  it("forceRescore bypasses the recent-score cache", async () => {
    handles = buildTestContainer({
      jobProviders: [new FakeJobProvider("ADZUNA", [baseListing()])],
    });
    seedProfileAndResume(handles);

    await POST(jsonRequest({ userId: "u1" }));
    expect(handles.aiProvider.scoreMatchCallCount).toBe(1);

    await POST(jsonRequest({ userId: "u1", forceRescore: true }));
    expect(handles.aiProvider.scoreMatchCallCount).toBe(2);
  });
});
