import { describe, expect, it } from "vitest";
import { loadOpenAiConfig } from "@/infrastructure/llm/openai/openai-config";

describe("loadOpenAiConfig", () => {
  it("reads apiKey and model from the given env source", () => {
    const config = loadOpenAiConfig({ OPENAI_API_KEY: "key123", OPENAI_MODEL: "gpt-4o" });
    expect(config).toEqual({ apiKey: "key123", model: "gpt-4o" });
  });

  it("defaults model to gpt-4o-mini when OPENAI_MODEL is unset", () => {
    const config = loadOpenAiConfig({ OPENAI_API_KEY: "key123" });
    expect(config.model).toBe("gpt-4o-mini");
  });

  it("throws when OPENAI_API_KEY is missing", () => {
    expect(() => loadOpenAiConfig({})).toThrow();
  });

  it("throws when OPENAI_API_KEY is blank", () => {
    expect(() => loadOpenAiConfig({ OPENAI_API_KEY: "" })).toThrow();
  });
});
