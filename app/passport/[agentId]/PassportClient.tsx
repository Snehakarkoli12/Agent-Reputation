"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

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

export default function PassportClient({
  initialData,
  agentId,
}: {
  initialData: VerifyResponse;
  agentId: string;
}) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  
  // Real task execution results
  const [lastTaskResult, setLastTaskResult] = useState<{
    success: boolean;
    response: string;
    scoreDelta: number;
    newScore: number;
    stateHash: string;
    txHash: string | null;
  } | null>(null);

  const [taskError, setTaskError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [selectedAgentHistory, setSelectedAgentHistory] = useState<any[]>([]);

  async function loadTaskHistory() {
    try {
      const { data: histData, error } = await supabaseBrowser
        .from("task_history")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSelectedAgentHistory(histData || []);
    } catch (err: any) {
      console.error("Failed to load task history:", err);
    }
  }

  useEffect(() => {
    loadTaskHistory();
  }, [agentId]);

  async function refreshVerification() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch(`/api/verify/${agentId}`, { cache: "no-store" });
      if (res.ok) {
        setData(await res.json());
        await loadTaskHistory();
      } else {
        const errData = await res.json().catch(() => ({}));
        setRefreshError(errData.error ?? `Error status: ${res.status}`);
      }
    } catch (e: any) {
      setRefreshError(e.message ?? "Network error during refresh");
    } finally {
      setRefreshing(false);
    }
  }

  async function runTask() {
    if (!prompt.trim()) return;
    setRunning(true);
    setTaskError(null);
    setLastTaskResult(null);
    try {
      const res = await fetch("/api/execute-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, prompt }),
      });
      
      const result = await res.json();
      if (res.ok) {
        if (result.error) {
          setTaskError(result.error);
        } else {
          setLastTaskResult(result);
          setPrompt("");
          await refreshVerification();
        }
      } else {
        setTaskError(result.error ?? `Server error: ${res.status}`);
      }
    } catch (error: any) {
      setTaskError(error.message ?? "Network error during task execution");
    } finally {
      setRunning(false);
    }
  }

  const { agent, isVerified, recomputedHash, onChainHash, onChainVersion, onChainUpdatedAt } =
    data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12 relative overflow-hidden">
      {/* Background glow decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="mx-auto max-w-3xl space-y-8 z-10 relative">
        {/* Navigation & Casing Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1.5 transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span> Back to Registry
          </Link>
          <div className="text-xs font-mono text-slate-500">
            PASSPORT: {agent.id}
          </div>
        </div>

        {/* Header Profile */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-xl">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">{agent.name}</h1>
            <p className="text-slate-400 text-sm mt-2 max-w-xl">{agent.description}</p>
          </div>
          <div className="flex sm:self-start mt-1">
            <VerificationBadge isVerified={isVerified} />
          </div>
        </div>

        {/* Reputation stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Reputation Score" value={`${agent.reputationScore.toFixed(1)} / 100`} highlight={true} />
          <StatCard label="Total Tasks Evaluated" value={agent.totalTasks.toString()} />
          <StatCard
            label="Verified Success Rate"
            value={
              agent.totalTasks > 0
                ? `${Math.round((agent.successfulTasks / agent.totalTasks) * 100)}%`
                : "—"
            }
          />
        </div>

        {/* Verification details */}
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
            <h2 className="text-sm font-semibold tracking-wide text-indigo-400 uppercase">
              On-Chain Cryptographic Proof
            </h2>
            <button
              onClick={refreshVerification}
              disabled={refreshing}
              className="text-xs text-slate-400 hover:text-indigo-400 disabled:opacity-50 flex items-center gap-1 transition-all"
            >
              {refreshing ? (
                <>
                  <span className="animate-spin inline-block mr-1">↻</span> Refreshing...
                </>
              ) : (
                "↻ Refresh state"
              )}
            </button>
          </div>

          <div className="space-y-4">
            <HashRow label="Local Database Hash (recomputed from state)" value={recomputedHash} />
            <HashRow label="On-chain Anchored Hash (Sepolia)" value={onChainHash ?? "Not yet anchored"} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/40">
            <div>
              <span className="text-slate-500 block mb-0.5">Database version</span>
              <span className="font-mono text-slate-200">{agent.stateVersion}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">On-chain version</span>
              <span className="font-mono text-slate-200">{onChainVersion}</span>
            </div>
          </div>
          
          {onChainUpdatedAt && (
            <p className="text-xs text-slate-500 text-right pt-1">
              Last state anchor: {new Date(onChainUpdatedAt).toLocaleString()}
            </p>
          )}
          
          {refreshError && (
            <p className="text-xs text-rose-400 font-medium text-right pt-1">
              Failed to refresh state: {refreshError}
            </p>
          )}
        </div>

        {/* Run a task */}
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-semibold tracking-wide text-indigo-400 uppercase border-b border-slate-800/60 pb-3">
            Sandbox Evaluation Run
          </h2>
          <p className="text-xs text-slate-400">
            Interact with the agent and trigger a blockchain reputation anchor.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Assign a directive to this agent (e.g., 'Analyze code structure', 'Run transaction analysis')..."
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all"
            rows={3}
          />
          <button
            onClick={runTask}
            disabled={running || !prompt.trim()}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 text-sm font-semibold tracking-wide shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-white"
          >
            {running ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-ping w-2 h-2 rounded-full bg-emerald-400" />
                Executing task & anchoring state hash on-chain...
              </span>
            ) : (
              "Dispatch Directive"
            )}
          </button>

          {taskError && (
            <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-400 animate-fadeIn flex flex-col gap-1">
              <span className="font-semibold text-rose-500">Execution Error:</span>
              <p>{taskError}</p>
            </div>
          )}

          {lastTaskResult && (
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/20 p-5 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Sandbox Output Details</span>
                <span className={`text-xs px-2.5 py-0.5 rounded border font-mono font-semibold ${
                  lastTaskResult.success
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}>
                  {lastTaskResult.success ? "Success" : "Failed / Evaluated Positive?"}
                </span>
              </div>
              
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">Agent AI Response</span>
                <p className="text-sm text-slate-300 bg-slate-950/60 border border-slate-900 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {lastTaskResult.response}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 block mb-0.5">Reputation Score Update</span>
                  <span className={`text-sm font-bold font-mono ${
                    lastTaskResult.scoreDelta > 0 
                      ? "text-emerald-400" 
                      : lastTaskResult.scoreDelta < 0 
                        ? "text-rose-400" 
                        : "text-slate-300"
                  }`}>
                    {lastTaskResult.scoreDelta >= 0 ? `+${lastTaskResult.scoreDelta.toFixed(1)}` : lastTaskResult.scoreDelta.toFixed(1)} (Score: {lastTaskResult.newScore.toFixed(1)})
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 block mb-0.5">On-chain Anchoring TX</span>
                  {lastTaskResult.txHash ? (
                    <span className="text-xs font-mono text-indigo-300 break-all select-all block bg-slate-950/40 p-1 border border-slate-900 rounded">
                      {lastTaskResult.txHash}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-400 font-medium">Pending/Local Anchor Only</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">Computed State Hash</span>
                <div className="font-mono text-xs text-slate-400 break-all bg-slate-950/60 border border-slate-900 p-2.5 rounded-lg select-all">
                  {lastTaskResult.stateHash}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Task History Panel */}
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-xl p-6 space-y-4 shadow-xl">
          <div className="border-b border-slate-800/60 pb-3">
            <h2 className="text-sm font-semibold tracking-wide text-indigo-400 uppercase">
              Agent Historical Run Logs ({selectedAgentHistory.length})
            </h2>
            <p className="text-xs text-slate-500">Append-only audit trail of historical runs and evaluations.</p>
          </div>

          {selectedAgentHistory.length === 0 ? (
            <div className="rounded-xl border border-slate-900 bg-slate-950/40 p-6 text-center">
              <p className="text-xs text-slate-500">No evaluations logged for this agent.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
              {selectedAgentHistory.map((run) => (
                <div key={run.id} className="rounded-xl border border-slate-900 bg-slate-950/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold font-mono px-2 py-0.5 rounded border ${
                      run.success
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}>
                      {run.success ? "Success" : "Failed / Refused"}
                    </span>
                    <span className="text-slate-500">
                      {new Date(run.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Prompt input</span>
                    <p className="text-xs text-slate-300 font-mono italic bg-slate-950/40 border border-slate-900 p-2 rounded leading-relaxed">
                      "{run.prompt}"
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Response output</span>
                    <p className="text-xs text-slate-300 bg-slate-950/40 border border-slate-900 p-2 rounded leading-relaxed whitespace-pre-wrap">
                      {run.response}
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1 text-slate-400">
                    <span>
                      Delta:{" "}
                      <strong className={run.score_delta >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {Number(run.score_delta) >= 0 ? `+${Number(run.score_delta)}` : run.score_delta}
                      </strong>
                    </span>
                    <span>
                      Reputation after: <strong>{Number(run.reputation_score_after).toFixed(1)}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VerificationBadge({ isVerified }: { isVerified: boolean }) {
  return (
    <span
      className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide flex items-center gap-1.5 shadow-sm border ${
        isVerified
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${isVerified ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
      {isVerified ? "Verified Authentic" : "Tamper Detected"}
    </span>
  );
}

function StatCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm transition-all duration-300 ${
      highlight 
        ? "border-indigo-500/20 bg-indigo-500/5" 
        : "border-slate-900 bg-slate-900/30"
    }`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`text-2xl font-extrabold mt-1.5 ${highlight ? "text-indigo-300" : "text-slate-100"}`}>{value}</p>
    </div>
  );
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="font-mono text-xs text-slate-300 break-all bg-slate-950/60 border border-slate-900 p-2.5 rounded-lg select-all">
        {value}
      </div>
    </div>
  );
}
