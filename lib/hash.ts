import { createHash } from "crypto";

/**
 * Computes a deterministic SHA-256 hash over an agent's canonical state.
 * IMPORTANT: field order and serialization must be 100% deterministic —
 * this same function is used both when anchoring (API route) and when
 * verifying (dashboard), so any drift breaks verification.
 */
export interface AgentStateForHashing {
  id: string;
  name: string;
  reputationScore: number;
  totalTasks: number;
  successfulTasks: number;
  stateVersion: number;
}

export function computeAgentStateHash(state: AgentStateForHashing): string {
  const canonical = JSON.stringify({
    id: state.id,
    name: state.name,
    reputationScore: state.reputationScore,
    totalTasks: state.totalTasks,
    successfulTasks: state.successfulTasks,
    stateVersion: state.stateVersion,
  });

  return "0x" + createHash("sha256").update(canonical).digest("hex");
}