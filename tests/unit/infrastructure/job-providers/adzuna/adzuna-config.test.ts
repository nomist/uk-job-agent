import { describe, expect, it } from "vitest";
import { loadAdzunaConfig } from "@/infrastructure/job-providers/adzuna/adzuna-config";

describe("loadAdzunaConfig", () => {
  it("reads appId/appKey/country from the given env source", () => {
    const config = loadAdzunaConfig({
      ADZUNA_APP_ID: "id123",
      ADZUNA_APP_KEY: "key456",
      ADZUNA_COUNTRY: "us",
    });

    expect(config).toEqual({ appId: "id123", appKey: "key456", country: "us" });
  });

  it("defaults country to gb when ADZUNA_COUNTRY is unset", () => {
    const config = loadAdzunaConfig({ ADZUNA_APP_ID: "id123", ADZUNA_APP_KEY: "key456" });
    expect(config.country).toBe("gb");
  });

  it("throws when ADZUNA_APP_ID is missing", () => {
    expect(() => loadAdzunaConfig({ ADZUNA_APP_KEY: "key456" })).toThrow();
  });

  it("throws when ADZUNA_APP_KEY is missing", () => {
    expect(() => loadAdzunaConfig({ ADZUNA_APP_ID: "id123" })).toThrow();
  });

  it("throws when both are missing", () => {
    expect(() => loadAdzunaConfig({})).toThrow();
  });
});
