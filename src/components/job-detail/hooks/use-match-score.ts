import { useAiAction, type UseAiActionResult } from "@/components/shared/use-ai-action";
import { scoreJobMatch, type MatchScoreJson } from "@/lib/api/ai-client";

/** Isolates the Match Score card's AI request state — see useAiAction for the underlying state machine. */
export function useMatchScore(jobId: string): UseAiActionResult<MatchScoreJson> {
  return useAiAction(() => scoreJobMatch(jobId));
}
