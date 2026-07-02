import { describe, expect, it } from "vitest";
import { loadReedConfig } from "@/infrastructure/job-providers/reed/reed-config";

describe("loadReedConfig", () => {
  it("reads apiKey from the given env source", () => {
    const config = loadReedConfig({ REED_API_KEY: "key123" });
    expect(config).toEqual({ apiKey: "key123" });
  });

  it("throws when REED_API_KEY is missing", () => {
    expect(() => loadReedConfig({})).toThrow();
  });

  it("throws when REED_API_KEY is blank", () => {
    expect(() => loadReedConfig({ REED_API_KEY: "" })).toThrow();
  });
});
