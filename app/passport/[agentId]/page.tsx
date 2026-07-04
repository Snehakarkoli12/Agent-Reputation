"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface VerifyResponse {
  agent: {
    id: string;
    name: string;
    description: string | null;
    reputationScore: number;
    totalTasks: number;
    successfulTasks: number;
    stateVersion: number;
  };
  recomputedHash: string;
  onChainHash: string | null;
  onChainVersion: number;
  onChainUpdatedAt: string | null;
  isVerified: boolean;
}

interface ExecutionResult {
  success: boolean;
  response: string;
  reputation: {
    previousScore: number;
    newScore: number;
    scoreDelta: number;
  };
  metrics: {
    totalTasks: number;
    successfulTasks: number;
    successRate: string;
  };
  blockchain: {
    anchored: boolean;
    stateHash: string;
    txHash: string | null;
  };
}

export default function PassportPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);

  const [data, setData] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [executing, setExecuting] = useState(false);

  const [result, setResult] =
    useState<ExecutionResult | null>(null);

  const [error, setError] = useState("");

  async function loadPassport(sync = false) {
    try {
      if (sync) setSyncing(true);
      else setLoading(true);

      const url = sync ? `/api/verify/${agentId}?sync=true` : `/api/verify/${agentId}`;
      const res = await fetch(url, {
        cache: "no-store",
      });

      if (!res.ok) {
        setData(null);
        return;
      }

      const json = await res.json();

      setData(json);
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadPassport();
  }, [agentId]);

  async function handleExecuteTask() {
    console.log("Execute Task button clicked. Prompt:", prompt);
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    try {
      setExecuting(true);
      setError("");
      setResult(null);

      const payload = { agentId, prompt };
      console.log("Sending task execution payload:", payload);

      const res = await fetch("/api/execute-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Fetch response status:", res.status);
      const json = await res.json();
      console.log("API response data:", json);

      if (!res.ok) {
        throw new Error(json.error || `Execution failed with status ${res.status}`);
      }

      setResult(json);

      // Refresh live passport data
      await loadPassport();

      // Clear textarea
      setPrompt("");

    } catch (err: any) {
      console.error("Task execution failed with error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setExecuting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading passport...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-6">

        <div className="max-w-md w-full text-center space-y-6">

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rose-500/30 bg-rose-500/5 text-rose-400 text-xs font-medium uppercase">
            ✦ Registry Error
          </div>

          <h1 className="text-4xl font-bold">
            Agent Passport Not Found
          </h1>

          <p className="text-slate-400">
            The requested Agent ID (
            <span className="font-mono text-indigo-400">
              {agentId}
            </span>
            ) does not exist in the registry.
          </p>

          <Link
            href="/"
            className="inline-block rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 font-semibold"
          >
            ← Back to Registry
          </Link>
        </div>
      </div>
    );
  }

  const successRate =
    data.agent.totalTasks > 0
      ? (
        (data.agent.successfulTasks /
          data.agent.totalTasks) *
        100
      ).toFixed(1)
      : "0";

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-10">

      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-2">

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 text-xs uppercase">
            ✦ Blockchain Reputation Registry
          </div>

          <h1 className="text-4xl font-bold">
            {data.agent.name}
          </h1>

          <p className="text-slate-400">
            {data.agent.description}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-slate-400 text-sm">
              Reputation
            </p>

            <p className="text-3xl font-bold mt-2">
              {data.agent.reputationScore}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-slate-400 text-sm">
              Total Tasks
            </p>

            <p className="text-3xl font-bold mt-2">
              {data.agent.totalTasks}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-slate-400 text-sm">
              Success Rate
            </p>

            <p className="text-3xl font-bold mt-2">
              {successRate}%
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-slate-400 text-sm">
              State Version
            </p>

            <p className="text-3xl font-bold mt-2">
              {data.agent.stateVersion}
            </p>
          </div>
        </div>

        {/* Execute Task */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">

          <h2 className="text-2xl font-semibold">
            Execute Agent Task
          </h2>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Explain blockchain consensus..."
            className="w-full h-40 rounded-xl bg-slate-950 border border-slate-700 p-4 outline-none resize-none"
          />

          <button
            onClick={handleExecuteTask}
            disabled={executing}
            className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {executing ? "Executing..." : "Execute Task"}
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4">
              {error}
            </div>
          )}
        </div>

        {/* Execution Result */}
        {result && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">

            <h2 className="text-2xl font-semibold">
              Execution Result
            </h2>

            <div>
              <p className="text-slate-400 mb-2">
                AI Response
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 whitespace-pre-wrap">
                {result.response}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <p className="text-slate-400 text-sm">
                  Score Delta
                </p>

                <p className="text-2xl font-bold mt-2">
                  {result.reputation.scoreDelta > 0 ? "+" : ""}
                  {result.reputation.scoreDelta}
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <p className="text-slate-400 text-sm">
                  Updated Reputation
                </p>

                <p className="text-2xl font-bold mt-2">
                  {result.reputation.newScore}
                </p>
              </div>
            </div>

            <div>
              <p className="text-slate-400 mb-2">
                State Hash
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 break-all text-sm font-mono">
                {result.blockchain.stateHash}
              </div>
            </div>

            <div>
              <p className="text-slate-400 mb-2">
                Transaction Hash
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 break-all text-sm font-mono">
                {result.blockchain.txHash ?? "Not anchored yet"}
              </div>
            </div>
          </div>
        )}

        {/* Verification */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">

          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              Verification Status
            </h2>
            <button
              onClick={() => loadPassport(true)}
              disabled={syncing}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs px-4 py-2 rounded-xl font-semibold transition-all"
            >
              {syncing ? "Syncing..." : "Sync Proof"}
            </button>
          </div>

          <div className="grid gap-4">

            <div>
              <p className="text-slate-400 text-sm mb-1">
                Database Hash
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 break-all text-sm font-mono">
                {data.recomputedHash}
              </div>
            </div>

            <div>
              <p className="text-slate-400 text-sm mb-1">
                On-chain Hash
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 break-all text-sm font-mono">
                {data.onChainHash ?? "Not anchored"}
              </div>
            </div>

            <div className="pt-2">
              {data.isVerified ? (
                <div className="text-emerald-400 font-semibold">
                  ✓ Hash Verified
                </div>
              ) : (
                <div className="text-rose-400 font-semibold">
                  ✗ Hash Mismatch
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

