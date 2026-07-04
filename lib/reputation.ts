/**
 * Minimal reputation engine.
 * For the hackathon MVP: success is determined by basic heuristics on the
 * LLM response (non-empty, no refusal/error language, reasonable length).
 * Swap in a more sophisticated grader (e.g. a second LLM call as judge) later.
 */
export interface ReputationResult {
  success: boolean;
  scoreDelta: number;
}

const REFUSAL_MARKERS = ["i cannot", "i can't", "i'm unable", "as an ai language model"];

export function evaluateTaskResponse(prompt: string, response: string): ReputationResult {
  const trimmed = response.trim();
  const lower = trimmed.toLowerCase();

  const isEmpty = trimmed.length < 5;
  const looksLikeRefusal = REFUSAL_MARKERS.some((marker) => lower.includes(marker));
  const isReasonablyDetailed = trimmed.length >= 40;

  const success = !isEmpty && !looksLikeRefusal && isReasonablyDetailed;

  // Simple delta scheme: reward success, penalize failure, clipped at call site.
  const scoreDelta = success ? 2.5 : -4;

  return { success, scoreDelta };
}

export function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score));
}