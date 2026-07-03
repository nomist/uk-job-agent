import { z } from "zod";
import { OpenAiNotConfiguredError } from "./openai-errors";

const openAiConfigSchema = z.object({
  apiKey: z.string().min(1, "OPENAI_API_KEY is required"),
  model: z.string().min(1).default("gpt-4o-mini"),
});

export type OpenAiConfig = z.infer<typeof openAiConfigSchema>;

/**
 * Reads OPENAI_API_KEY (+ optional OPENAI_MODEL). Kept separate from the
 * shared src/infrastructure/config/env.ts for the same reason as the job
 * provider adapters: importing this adapter, or building without OpenAI
 * configured, shouldn't require this var — validation only runs when this
 * is called, i.e. when an OpenAiProvider is constructed.
 *
 * Throws OpenAiNotConfiguredError (not the raw zod error) on failure, so
 * the API layer can return a clear, actionable message instead of a
 * generic 500 — see handle-api-error.ts.
 */
export function loadOpenAiConfig(
  env: Record<string, string | undefined> = process.env,
): OpenAiConfig {
  const result = openAiConfigSchema.safeParse({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
  });

  if (!result.success) {
    throw new OpenAiNotConfiguredError(
      "AI features are not configured. Set OPENAI_API_KEY to enable Match Score, Cover Letter, and CV Suggestions.",
      result.error,
    );
  }

  return result.data;
}
