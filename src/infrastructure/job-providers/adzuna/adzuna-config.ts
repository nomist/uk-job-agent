import { z } from "zod";

const adzunaConfigSchema = z.object({
  appId: z.string().min(1, "ADZUNA_APP_ID is required"),
  appKey: z.string().min(1, "ADZUNA_APP_KEY is required"),
  country: z.string().min(1).default("gb"),
});

export type AdzunaConfig = z.infer<typeof adzunaConfigSchema>;

/**
 * Reads ADZUNA_APP_ID / ADZUNA_APP_KEY / ADZUNA_COUNTRY. Kept separate from
 * the shared src/infrastructure/config/env.ts so importing the Adzuna
 * adapter (or building the app without Adzuna configured) doesn't require
 * these vars to be set — validation only runs when this is actually called,
 * i.e. when an AdzunaJobProvider is constructed.
 */
export function loadAdzunaConfig(
  env: Record<string, string | undefined> = process.env,
): AdzunaConfig {
  return adzunaConfigSchema.parse({
    appId: env.ADZUNA_APP_ID,
    appKey: env.ADZUNA_APP_KEY,
    country: env.ADZUNA_COUNTRY,
  });
}

/**
 * Non-throwing counterpart to loadAdzunaConfig(), used by the DI container
 * to decide whether AdzunaJobProvider can be constructed at all — without
 * this, checking availability would mean catching the exception
 * loadAdzunaConfig() throws on missing credentials.
 */
export function hasAdzunaCredentials(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return adzunaConfigSchema
    .pick({ appId: true, appKey: true })
    .safeParse({ appId: env.ADZUNA_APP_ID, appKey: env.ADZUNA_APP_KEY }).success;
}
