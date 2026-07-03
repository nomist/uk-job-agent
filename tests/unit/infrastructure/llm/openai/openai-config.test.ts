import { describe, expect, it } from "vitest";
import { loadOpenAiConfig } from "@/infrastructure/llm/openai/openai-config";
import { OpenAiNotConfiguredError } from "@/infrastructure/llm/openai/openai-errors";

describe("loadOpenAiConfig", () => {
  it("reads apiKey and model from the given env source", () => {
    const config = loadOpenAiConfig({ OPENAI_API_KEY: "key123", OPENAI_MODEL: "gpt-4o" });
    expect(config).toEqual({ apiKey: "key123", model: "gpt-4o" });
  });

  it("defaults model to gpt-4o-mini when OPENAI_MODEL is unset", () => {
    const config = loadOpenAiConfig({ OPENAI_API_KEY: "key123" });
    expect(config.model).toBe("gpt-4o-mini");
  });

  it("throws OpenAiNotConfiguredError (not a raw zod error) when OPENAI_API_KEY is missing", () => {
    expect(() => loadOpenAiConfig({})).toThrow(OpenAiNotConfiguredError);
    expect(() => loadOpenAiConfig({})).toThrow(
      "AI features are not configured. Set OPENAI_API_KEY to enable Match Score, Cover Letter, and CV Suggestions.",
    );
  });

  it("throws OpenAiNotConfiguredError when OPENAI_API_KEY is blank", () => {
    expect(() => loadOpenAiConfig({ OPENAI_API_KEY: "" })).toThrow(OpenAiNotConfiguredError);
  });
});
