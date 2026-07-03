import { useAiAction, type UseAiActionResult } from "@/components/shared/use-ai-action";
import {
  generateCoverLetter,
  type CoverLetterJson,
  type CoverLetterTone,
} from "@/lib/api/ai-client";

/** Isolates the Cover Letter card's AI request state — see useAiAction for the underlying state machine. */
export function useCoverLetter(
  jobId: string,
  tone?: CoverLetterTone,
): UseAiActionResult<CoverLetterJson> {
  return useAiAction(() => generateCoverLetter(jobId, tone));
}
