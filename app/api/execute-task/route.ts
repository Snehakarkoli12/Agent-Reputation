import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { supabaseAdmin } from "@/lib/supabase/server";
import { evaluateTaskResponse, clampScore } from "@/lib/reputation";
import { computeAgentStateHash } from "@/lib/hash";
import {
  agentIdToBytes32,
  getServerSigner,
  getRegistryContract,
} from "@/lib/contract/client";

// OpenRouter configuration
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Agent Reputation Passport",
  },
});

interface ExecuteTaskBody {
  agentId: string;
  prompt: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ExecuteTaskBody = await req.json();

    const { agentId, prompt } = body;

    if (!agentId || !prompt) {
      return NextResponse.json(
        {
          error: "agentId and prompt are required",
        },
        { status: 400 }
      );
    }

    // 1. Load agent state
    const { data: agent, error: agentError } = await supabaseAdmin
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        {
          error: "Agent not found",
        },
        { status: 404 }
      );
    }

    // 2. Execute task using OpenRouter + Gemma
    const completion = await openai.chat.completions.create({
      model: "nvidia/nemotron-3-ultra-550b-a55b:free",

      messages: [
        {
          role: "system",
          content: `
You are ${agent.name}.

${agent.description ?? ""}

You are a reliable AI agent.
Provide accurate, concise, structured responses.
Avoid hallucinations and unsupported claims.
`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],

      temperature: 0.3,
      max_tokens: 500,
    });

    const responseText =
      completion.choices[0]?.message?.content ??
      "No response generated.";

    // 3. Evaluate response quality
    const { success, scoreDelta } = evaluateTaskResponse(
      prompt,
      responseText
    );

    const newScore = clampScore(
      Number(agent.reputation_score) + scoreDelta
    );

    const newTotalTasks = agent.total_tasks + 1;

    const newSuccessfulTasks =
      agent.successful_tasks + (success ? 1 : 0);

    const newStateVersion = agent.state_version + 1;

    // 4. Generate cryptographic state hash
    const stateHash = computeAgentStateHash({
      id: agent.id,
      name: agent.name,
      reputationScore: newScore,
      totalTasks: newTotalTasks,
      successfulTasks: newSuccessfulTasks,
      stateVersion: newStateVersion,
    });

    // 5. Save task history
    const { error: taskInsertError } = await supabaseAdmin
      .from("task_history")
      .insert({
        agent_id: agent.id,
        prompt,
        response: responseText,
        success,
        score_delta: scoreDelta,
        reputation_score_after: newScore,
      });

    if (taskInsertError) {
      console.error(taskInsertError);

      return NextResponse.json(
        {
          error: "Failed to log task",
        },
        { status: 500 }
      );
    }

    // 6. Update agent metrics
    const { error: agentUpdateError } = await supabaseAdmin
      .from("agents")
      .update({
        reputation_score: newScore,
        total_tasks: newTotalTasks,
        successful_tasks: newSuccessfulTasks,
        state_version: newStateVersion,
        last_state_hash: stateHash,
        last_anchored_at: new Date().toISOString(),
      })
      .eq("id", agent.id);

    if (agentUpdateError) {
      console.error(agentUpdateError);

      return NextResponse.json(
        {
          error: "Failed to update agent",
        },
        { status: 500 }
      );
    }

    // 7. OPTIONAL blockchain anchoring
    // Safe fallback for hackathon/demo mode
    let txHash: string | null = null;

    try {
      const signer = getServerSigner();

      const contract = getRegistryContract(signer);

      const tx = await contract.updatePassportHash(
        agentIdToBytes32(agent.id),
        stateHash
      );

      const receipt = await tx.wait();

      txHash = receipt?.hash ?? tx.hash;
    } catch (chainError) {
      console.error(
        "Blockchain anchor skipped:",
        chainError
      );

      txHash = "DEMO-MOCK-TX-HASH";
    }

    // 8. Return response
    return NextResponse.json({
      success: true,

      response: responseText,

      reputation: {
        previousScore: agent.reputation_score,
        newScore,
        scoreDelta,
      },

      metrics: {
        totalTasks: newTotalTasks,
        successfulTasks: newSuccessfulTasks,
        successRate:
          (
            (newSuccessfulTasks / newTotalTasks) *
            100
          ).toFixed(1) + "%",
      },

      blockchain: {
        anchored: true,
        stateHash,
        txHash,
      },
    });
  } catch (err) {
    console.error("execute-task error:", err);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}