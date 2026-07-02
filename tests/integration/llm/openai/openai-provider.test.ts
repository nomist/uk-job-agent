import { describe, expect, it, vi } from "vitest";
import { Job } from "@/domain/entities/job";
import { Profile } from "@/domain/entities/profile";
import { Resume } from "@/domain/entities/resume";
import { Location } from "@/domain/value-objects/location";
import { OpenAiConfig } from "@/infrastructure/llm/openai/openai-config";
import {
  OpenAiRateLimitError,
  OpenAiRequestError,
  OpenAiResponseParseError,
} from "@/infrastructure/llm/openai/openai-errors";
import { OpenAiProvider } from "@/infrastructure/llm/openai/openai-provider";

const config: OpenAiConfig = { apiKey: "key123", model: "gpt-4o-mini" };

const job = Job.create({
  id: "j1",
  companyId: "c1",
  provider: "ADZUNA",
  externalId: "e1",
  title: "Staff Engineer",
  description: "desc",
  url: "https://example.com/jobs/1",
  location: Location.create({ country: "UK", isRemote: true }),
  firstSeenAt: new Date(),
  lastSeenAt: new Date(),
});
const profile = Profile.create({ id: "p1", userId: "u1", updatedAt: new Date() });
const resume = Resume.create({
  id: "r1",
  profileId: "p1",
  label: "General",
  content: "content",
  createdAt: new Date(),
});

function chatCompletionResponse(contentObject: unknown, status = 200): Response {
  const body = {
    id: "chatcmpl-1",
    model: "gpt-4o-mini-2024-07-18",
    choices: [
      {
        message: { role: "assistant", content: JSON.stringify(contentObject) },
        finish_reason: "stop",
      },
    ],
  };
  return new Response(JSON.stringify(body), { status });
}

describe("OpenAiProvider", () => {
  describe("scoreMatch", () => {
    it("returns a parsed match score from a successful response", async () => {
      const fetchImpl = vi.fn(async () =>
        chatCompletionResponse({
          score: 80,
          confidence: 0.7,
          rationale: "Good fit.",
          missingSkills: [],
        }),
      );
      const provider = new OpenAiProvider(config, fetchImpl);

      const result = await provider.scoreMatch({ job, profile, resume });

      expect(result.score).toBe(80);
      expect(result.modelVersion).toBe("gpt-4o-mini");
    });

    it("sends the API key as a Bearer token, the configured model, and JSON response mode", async () => {
      const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
        chatCompletionResponse({
          score: 80,
          confidence: 0.7,
          rationale: "Good fit.",
          missingSkills: [],
        }),
      );
      const provider = new OpenAiProvider(config, fetchImpl);

      await provider.scoreMatch({ job, profile, resume });

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      const [url, init] = fetchImpl.mock.calls[0];
      expect(url).toBe("https://api.openai.com/v1/chat/completions");

      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer key123");

      const requestBody = JSON.parse(init?.body as string);
      expect(requestBody.model).toBe("gpt-4o-mini");
      expect(requestBody.response_format).toEqual({ type: "json_object" });
      expect(requestBody.messages).toHaveLength(2);
    });
  });

  describe("generateCoverLetter", () => {
    it("returns parsed cover letter content", async () => {
      const fetchImpl = vi.fn(async () =>
        chatCompletionResponse({ content: "Dear Hiring Manager..." }),
      );
      const provider = new OpenAiProvider(config, fetchImpl);

      const result = await provider.generateCoverLetter({ job, profile, resume });
      expect(result.content).toBe("Dear Hiring Manager...");
      expect(result.modelVersion).toBe("gpt-4o-mini");
    });
  });

  describe("suggestCvImprovements", () => {
    it("returns parsed suggestions", async () => {
      const fetchImpl = vi.fn(async () =>
        chatCompletionResponse({
          suggestions: [{ category: "wording", text: "x", priority: "LOW" }],
        }),
      );
      const provider = new OpenAiProvider(config, fetchImpl);

      const result = await provider.suggestCvImprovements({ resume });
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].priority).toBe("LOW");
    });
  });

  describe("error handling", () => {
    it("throws OpenAiRateLimitError with retryAfterSeconds on a 429 response", async () => {
      const fetchImpl = vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { message: "Rate limited" } }), {
            status: 429,
            headers: { "Retry-After": "12" },
          }),
      );
      const provider = new OpenAiProvider(config, fetchImpl);

      const error = await provider
        .scoreMatch({ job, profile, resume })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(OpenAiRateLimitError);
      expect((error as OpenAiRateLimitError).retryAfterSeconds).toBe(12);
    });

    it("leaves retryAfterSeconds undefined when OpenAI doesn't send a Retry-After header", async () => {
      const fetchImpl = vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { message: "Rate limited" } }), { status: 429 }),
      );
      const provider = new OpenAiProvider(config, fetchImpl);

      const error = await provider
        .scoreMatch({ job, profile, resume })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(OpenAiRateLimitError);
      expect((error as OpenAiRateLimitError).retryAfterSeconds).toBeUndefined();
    });

    it("throws OpenAiRequestError on a non-OK, non-429 response", async () => {
      const fetchImpl = vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 }),
      );
      const provider = new OpenAiProvider(config, fetchImpl);

      await expect(provider.scoreMatch({ job, profile, resume })).rejects.toThrow(
        OpenAiRequestError,
      );
    });

    it("throws OpenAiRequestError when the network request fails", async () => {
      const fetchImpl = vi.fn(async () => {
        throw new Error("network down");
      });
      const provider = new OpenAiProvider(config, fetchImpl);

      await expect(provider.scoreMatch({ job, profile, resume })).rejects.toThrow(
        OpenAiRequestError,
      );
    });

    it("throws OpenAiRequestError when the response body isn't valid JSON", async () => {
      const fetchImpl = vi.fn(async () => new Response("not json", { status: 200 }));
      const provider = new OpenAiProvider(config, fetchImpl);

      await expect(provider.scoreMatch({ job, profile, resume })).rejects.toThrow(
        OpenAiRequestError,
      );
    });

    it("throws OpenAiRequestError when there are no choices in the response", async () => {
      const fetchImpl = vi.fn(
        async () => new Response(JSON.stringify({ choices: [] }), { status: 200 }),
      );
      const provider = new OpenAiProvider(config, fetchImpl);

      await expect(provider.scoreMatch({ job, profile, resume })).rejects.toThrow(
        OpenAiRequestError,
      );
    });

    it("throws OpenAiResponseParseError when the JSON content doesn't match the expected schema", async () => {
      const fetchImpl = vi.fn(async () => chatCompletionResponse({ unexpected: "shape" }));
      const provider = new OpenAiProvider(config, fetchImpl);

      await expect(provider.scoreMatch({ job, profile, resume })).rejects.toThrow(
        OpenAiResponseParseError,
      );
    });
  });
});
