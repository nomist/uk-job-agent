import { describe, expect, it } from "vitest";
import { OpenAiResponseParseError } from "@/infrastructure/llm/openai/openai-errors";
import {
  parseCoverLetterResponse,
  parseCvSuggestionsResponse,
  parseMatchScoreResponse,
} from "@/infrastructure/llm/openai/openai-response-schemas";

describe("parseMatchScoreResponse", () => {
  it("parses a valid response", () => {
    const raw = JSON.stringify({
      score: 82,
      confidence: 0.75,
      rationale: "Strong overlap.",
      missingSkills: ["Kubernetes"],
    });

    expect(parseMatchScoreResponse(raw, "gpt-4o-mini")).toEqual({
      score: 82,
      confidence: 0.75,
      rationale: "Strong overlap.",
      missingSkills: ["Kubernetes"],
      modelVersion: "gpt-4o-mini",
    });
  });

  it("defaults missingSkills to an empty array when omitted", () => {
    const raw = JSON.stringify({ score: 50, confidence: 0.5, rationale: "OK fit." });
    expect(parseMatchScoreResponse(raw, "gpt-4o-mini").missingSkills).toEqual([]);
  });

  it("throws OpenAiResponseParseError for invalid JSON", () => {
    expect(() => parseMatchScoreResponse("not json", "gpt-4o-mini")).toThrow(
      OpenAiResponseParseError,
    );
  });

  it("throws OpenAiResponseParseError when score is out of range", () => {
    const raw = JSON.stringify({ score: 150, confidence: 0.5, rationale: "x" });
    expect(() => parseMatchScoreResponse(raw, "gpt-4o-mini")).toThrow(OpenAiResponseParseError);
  });

  it("throws OpenAiResponseParseError when required fields are missing", () => {
    expect(() => parseMatchScoreResponse(JSON.stringify({ score: 50 }), "gpt-4o-mini")).toThrow(
      OpenAiResponseParseError,
    );
  });
});

describe("parseCoverLetterResponse", () => {
  it("parses a valid response", () => {
    const raw = JSON.stringify({ content: "Dear Hiring Manager..." });
    const result = parseCoverLetterResponse(raw, "gpt-4o-mini");

    expect(result.content).toBe("Dear Hiring Manager...");
    expect(result.modelVersion).toBe("gpt-4o-mini");
  });

  it("throws OpenAiResponseParseError when content is missing", () => {
    expect(() => parseCoverLetterResponse("{}", "gpt-4o-mini")).toThrow(OpenAiResponseParseError);
  });
});

describe("parseCvSuggestionsResponse", () => {
  it("parses a valid response", () => {
    const raw = JSON.stringify({
      suggestions: [{ category: "wording", text: "Quantify impact.", priority: "MEDIUM" }],
    });
    const result = parseCvSuggestionsResponse(raw, "gpt-4o-mini");

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].priority).toBe("MEDIUM");
  });

  it("defaults suggestions to an empty array when omitted", () => {
    expect(parseCvSuggestionsResponse("{}", "gpt-4o-mini").suggestions).toEqual([]);
  });

  it("throws OpenAiResponseParseError for an invalid priority value", () => {
    const raw = JSON.stringify({
      suggestions: [{ category: "wording", text: "x", priority: "URGENT" }],
    });
    expect(() => parseCvSuggestionsResponse(raw, "gpt-4o-mini")).toThrow(OpenAiResponseParseError);
  });
});
