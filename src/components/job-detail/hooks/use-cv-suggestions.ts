import { useAiAction, type UseAiActionResult } from "@/components/shared/use-ai-action";
import { suggestCvImprovements, type CvSuggestionsJson } from "@/lib/api/ai-client";

/** Isolates the CV Suggestions card's AI request state — see useAiAction for the underlying state machine. */
export function useCvSuggestions(jobId: string): UseAiActionResult<CvSuggestionsJson> {
  return useAiAction(() => suggestCvImprovements(jobId));
}
