import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { computeAgentStateHash } from "@/lib/hash";
import { agentIdToBytes32, getReadProvider, getRegistryContract, getServerSigner } from "@/lib/contract/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const { searchParams } = new URL(req.url);
  const sync = searchParams.get("sync") === "true";

  const { data: agent, error } = await supabaseAdmin
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .single();

  if (error || !agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Recompute the hash from the CURRENT database state
  const recomputedHash = computeAgentStateHash({
    id: agent.id,
    name: agent.name,
    reputationScore: Number(agent.reputation_score),
    totalTasks: agent.total_tasks,
    successfulTasks: agent.successful_tasks,
    stateVersion: agent.state_version,
  });

  if (sync) {
    try {
      const signer = getServerSigner();
      const contract = getRegistryContract(signer);
      const tx = await contract.updatePassportHash(agentIdToBytes32(agent.id), recomputedHash);
      await tx.wait();
    } catch (syncError) {
      console.error("Blockchain sync transaction failed:", syncError);
    }
  }

  // Read the on-chain hash
  let onChainHash: string | null = null;
  let onChainVersion = 0;
  let onChainUpdatedAt: string | null = null;

  try {
    const provider = getReadProvider();
    const contract = getRegistryContract(provider);
    const result = await contract.getPassport(agentIdToBytes32(agent.id));
    onChainHash = result[0];
    onChainVersion = Number(result[2]);
    onChainUpdatedAt =
      Number(result[1]) > 0 ? new Date(Number(result[1]) * 1000).toISOString() : null;
  } catch (chainError) {
    console.error("Chain read failed:", chainError);
  }

  const isVerified =
    onChainHash !== null &&
    onChainHash.toLowerCase() === recomputedHash.toLowerCase() &&
    onChainVersion === agent.state_version;

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      reputationScore: Number(agent.reputation_score),
      totalTasks: agent.total_tasks,
      successfulTasks: agent.successful_tasks,
      stateVersion: agent.state_version,
    },
    recomputedHash,
    onChainHash,
    onChainVersion,
    onChainUpdatedAt,
    isVerified,
  });
}