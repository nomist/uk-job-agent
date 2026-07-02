import { NextRequest } from "next/server";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { createContainer } from "@/lib/di/container";
import { createTestPrismaClient } from "../../support/test-prisma-client";

// Exercises the REAL createContainer() (no in-memory fakes) against the
// isolated test database, proving the actual fix end to end: GET /api/jobs
// must not require OPENAI_API_KEY, while AI routes still do. Only `prisma`
// is overridden (so this never touches dev.db); job providers and the AI
// provider go through the real default wiring in src/lib/di/container.ts.
const testPrisma = createTestPrismaClient();

vi.mock("@/lib/di/get-container", () => ({
  getContainer: () => createContainer({ prisma: testPrisma }),
}));

const { GET } = await import("@/app/api/jobs/route");
const { POST: scoreJob } = await import("@/app/api/jobs/[id]/score/route");

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("GET /api/jobs with the real container", () => {
  it("returns 200 and mock jobs in development when no provider or OpenAI credentials are set", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADZUNA_APP_ID", "");
    vi.stubEnv("ADZUNA_APP_KEY", "");
    vi.stubEnv("REED_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");

    const response = await GET(new NextRequest("http://localhost/api/jobs?q=engineer"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isMock).toBe(true);
    expect(body.jobs.length).toBeGreaterThan(0);
    for (const job of body.jobs) {
      expect(`${job.title} ${job.description}`.toLowerCase()).toContain("engineer");
    }
  });
});

describe("POST /api/jobs/:id/score with the real container", () => {
  it("still fails with a 500 when OPENAI_API_KEY is missing (AI routes require it)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADZUNA_APP_ID", "");
    vi.stubEnv("ADZUNA_APP_KEY", "");
    vi.stubEnv("REED_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");

    const response = await scoreJob(
      new NextRequest("http://localhost/api/jobs/missing-job/score", {
        method: "POST",
        body: JSON.stringify({ profileId: "p1" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "missing-job" }) },
    );

    // JobNotFoundError would normally fire first (404) — but scoreJobMatch()
    // builds ScoreJobMatchUseCase with aiProvider as a constructor argument,
    // so the missing-credentials failure happens at container-access time,
    // before the job lookup even runs.
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.message).toBe("Internal server error");
  });
});
