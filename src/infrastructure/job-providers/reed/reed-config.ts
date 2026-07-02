import { z } from "zod";

const reedConfigSchema = z.object({
  apiKey: z.string().min(1, "REED_API_KEY is required"),
});

export type ReedConfig = z.infer<typeof reedConfigSchema>;

/**
 * Reads REED_API_KEY. Kept separate from the shared
 * src/infrastructure/config/env.ts for the same reason as Adzuna's config:
 * importing the adapter (or building without Reed configured) shouldn't
 * require this var — validation only runs when this is called, i.e. when a
 * ReedJobProvider is constructed.
 */
export function loadReedConfig(env: Record<string, string | undefined> = process.env): ReedConfig {
  return reedConfigSchema.parse({
    apiKey: env.REED_API_KEY,
  });
}

/**
 * Non-throwing counterpart to loadReedConfig(), used by the DI container to
 * decide whether ReedJobProvider can be constructed at all.
 */
export function hasReedCredentials(env: Record<string, string | undefined> = process.env): boolean {
  return reedConfigSchema.safeParse({ apiKey: env.REED_API_KEY }).success;
}
