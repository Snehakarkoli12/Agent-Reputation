"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Home() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection states
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedAgentData, setSelectedAgentData] = useState<any | null>(null);
  const [selectedAgentHistory, setSelectedAgentHistory] = useState<any[]>([]);

  // Registry search query
  const [agentId, setAgentId] = useState("");

  // Sandbox state
  const [prompt, setPrompt] = useState("");
  const [executing, setExecuting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [lastTaskResult, setLastTaskResult] = useState<any | null>(null);

  // Verification details state
  const [verifyData, setVerifyData] = useState<any | null>(null);
  const [refreshingProof, setRefreshingProof] = useState(false);
  const [refreshProofError, setRefreshProofError] = useState<string | null>(null);

  const router = useRouter();

  // Load agent registry
  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/test");
        if (!res.ok) {
          throw new Error(`Failed to load agents: ${res.status}`);
        }
        const json = await res.json();
        if (json.error) {
          throw new Error(json.error.message || JSON.stringify(json.error));
        }
        const data = json.data || [];
        setAgents(data);

        // Auto-select first agent if available
        if (data.length > 0) {
          selectAgent(data[0].id, data);
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  async function fetchAgentsBackground() {
    try {
      const res = await fetch("/api/test");
      if (res.ok) {
        const json = await res.json();
        setAgents(json.data || []);
      }
    } catch (err) {
      console.error("Error refreshing agents:", err);
    }
  }

  async function selectAgent(id: string, currentAgents = agents) {
    setSelectedAgentId(id);
    setLastTaskResult(null);
    setTaskError(null);
    setPrompt("");
    setVerifyData(null);
    setRefreshProofError(null);

    const basicInfo = currentAgents.find((a) => a.id === id);
    if (basicInfo) {
      setSelectedAgentData(basicInfo);
    }

    await Promise.all([loadVerificationProof(id), loadTaskHistory(id)]);
  }

  async function loadVerificationProof(id: string, sync = false) {
    setRefreshingProof(true);
    setRefreshProofError(null);
    try {
      const url = sync ? `/api/verify/${id}?sync=true` : `/api/verify/${id}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const proof = await res.json();
        setVerifyData(proof);
        if (proof.agent) {
          setSelectedAgentData({
            id: proof.agent.id,
            name: proof.agent.name,
            description: proof.agent.description,
            reputation_score: proof.agent.reputationScore,
            total_tasks: proof.agent.totalTasks,
            successful_tasks: proof.agent.successfulTasks,
            state_version: proof.agent.stateVersion,
          });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setRefreshProofError(err.error ?? `Failed to fetch proof: ${res.status}`);
      }
    } catch (err: any) {
      setRefreshProofError(err.message ?? "Failed to fetch proof");
    } finally {
      setRefreshingProof(false);
    }
  }

  async function loadTaskHistory(id: string) {
    try {
      const { data, error: histError } = await supabaseBrowser
        .from("task_history")
        .select("*")
        .eq("agent_id", id)
        .order("created_at", { ascending: false });
      if (histError) throw histError;
      setSelectedAgentHistory(data || []);
    } catch (err: any) {
      console.error("Failed to load task history:", err);
    }
  }

  async function runTask() {
    console.log("Execute Task button clicked. Selected Agent:", selectedAgentId, "Prompt:", prompt);
    if (!selectedAgentId || !prompt.trim()) return;

    setExecuting(true);
    setTaskError(null);
    setLastTaskResult(null);
    try {
      const payload = { agentId: selectedAgentId, prompt };
      console.log("Sending task execution payload:", payload);

      const res = await fetch("/api/execute-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("Fetch response status:", res.status);
      const result = await res.json();
      console.log("API response data:", result);

      if (res.ok) {
        if (result.error) {
          setTaskError(result.error);
        } else {
          setLastTaskResult(result);
          setPrompt("");

          // Live refresh registry and context stats
          await fetchAgentsBackground();
          await Promise.all([
            loadVerificationProof(selectedAgentId),
            loadTaskHistory(selectedAgentId)
          ]);
        }
      } else {
        setTaskError(result.error ?? `Server error: ${res.status}`);
      }
    } catch (error: any) {
      console.error("Task execution failed with error:", error);
      setTaskError(error.message ?? "Network error running task");
    } finally {
      setExecuting(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = agentId.trim();
    if (!query) return;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(query)) {
      selectAgent(query);
      return;
    }

    const matchedAgent = agents.find(
      (a) =>
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.id.toLowerCase() === query.toLowerCase()
    );

    if (matchedAgent) {
      selectAgent(matchedAgent.id);
    } else {
      // Fallback fallback routing just in case
      router.push(`/passport/${query}`);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-8 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
            ✦
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Agent Reputation Registry <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">Sepolia Network</span>
            </h1>
            <p className="text-xs text-slate-400">Decentralized Trust & Execution Verification for AI Agents</p>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          V1.0.0 // SECURE RECORD
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 md:p-8 z-10 overflow-hidden">
        {/* Left Column: Registry (4 cols) */}
        <section className="lg:col-span-5 flex flex-col space-y-6 overflow-y-auto">
          {/* Registry Lookups */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 shadow-xl">
            <form onSubmit={handleSearch} className="space-y-3">
              <label htmlFor="search-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Agent Registry Lookup
              </label>
              <div className="flex gap-2">
                <input
                  id="search-input"
                  type="text"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="Lookup by Name or Agent UUID..."
                  className="flex-1 rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 text-xs font-semibold transition-all"
                >
                  Locate
                </button>
              </div>
            </form>
          </div>

          {/* Registry Showcases */}
          <div className="space-y-4 flex-1">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Registry Showcases ({agents.length})
              </h2>
            </div>

            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl border border-slate-900 bg-slate-900/10 p-5 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                      <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                    </div>
                    <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                    <div className="h-4 bg-slate-800 rounded w-full pt-2 border-t border-slate-900"></div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-center">
                <p className="text-sm text-rose-400">Failed to load registry: {error}</p>
              </div>
            )}

            {!loading && !error && agents.length === 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-8 text-center">
                <p className="text-sm text-slate-500">No agents registered in the database yet.</p>
              </div>
            )}

            {!loading && !error && agents.length > 0 && (
              <div className="space-y-3 max-h-[calc(100vh-270px)] overflow-y-auto pr-1 scrollbar-thin">
                {agents.map((agent) => {
                  const total = agent.total_tasks;
                  const successRate = total > 0
                    ? `${Math.round((agent.successful_tasks / total) * 100)}%`
                    : "—";
                  const isSelected = selectedAgentId === agent.id;

                  return (
                    <div
                      key={agent.id}
                      onClick={() => selectAgent(agent.id)}
                      className={`group relative rounded-xl border p-4 cursor-pointer transition-all duration-300 shadow-sm ${isSelected
                          ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500"
                          : "border-slate-900 bg-slate-900/20 hover:bg-slate-900/50 hover:border-slate-800"
                        }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className={`font-semibold text-sm transition-colors line-clamp-1 ${isSelected ? "text-indigo-400" : "text-slate-200 group-hover:text-indigo-400"
                            }`}>
                            {agent.name}
                          </h3>
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 font-mono font-semibold px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                            ★ {Number(agent.reputation_score).toFixed(1)}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 truncate">ID: {agent.id}</p>

                        <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-900/60">
                          <span className="text-slate-500">Tasks: <strong className="text-slate-300">{total}</strong></span>
                          <span className="text-slate-500">Success: <strong className="text-slate-300">{successRate}</strong></span>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-900/30">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectAgent(agent.id);
                            }}
                            className="px-2.5 py-1 text-[10px] font-semibold tracking-wide rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
                          >
                            Execute Task
                          </button>
                          <Link
                            href={`/passport/${agent.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 text-[10px] font-semibold tracking-wide rounded bg-slate-800/60 text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center"
                          >
                            Open Passport
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Execution Workspace Console (7 cols) */}
        <section className="lg:col-span-7 flex flex-col space-y-6 overflow-y-auto pr-1">
          {selectedAgentData ? (
            <div className="space-y-6">
              {/* Agent Title Profile */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-xl">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">ACTIVE WORKSPACE CONSOLE</div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-white mt-1">{selectedAgentData.name}</h2>
                  <p className="text-slate-400 text-xs mt-1 max-w-xl">{selectedAgentData.description}</p>
                </div>
                <div className="flex sm:self-start mt-1">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide flex items-center gap-1.5 shadow-sm border ${verifyData?.isVerified
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : verifyData === null
                          ? "bg-slate-800/40 text-slate-400 border-slate-700/40"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${verifyData?.isVerified
                        ? "bg-emerald-400 animate-pulse"
                        : verifyData === null
                          ? "bg-slate-500"
                          : "bg-rose-400"
                      }`} />
                    {verifyData?.isVerified
                      ? "Verified Authentic"
                      : verifyData === null
                        ? "Reading State..."
                        : "Tamper Detected"}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-4 shadow-sm">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Reputation Score</p>
                  <p className="text-xl font-extrabold mt-1 text-indigo-300">
                    {Number(selectedAgentData.reputation_score).toFixed(1)} <span className="text-xs text-slate-500 font-normal">/ 100</span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-4 shadow-sm">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Tasks Evaluated</p>
                  <p className="text-xl font-extrabold mt-1 text-slate-100">{selectedAgentData.total_tasks}</p>
                </div>
                <div className="rounded-xl border border-slate-900 bg-slate-900/30 p-4 shadow-sm">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Verified Success</p>
                  <p className="text-xl font-extrabold mt-1 text-slate-100">
                    {selectedAgentData.total_tasks > 0
                      ? `${Math.round((selectedAgentData.successful_tasks / selectedAgentData.total_tasks) * 100)}%`
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Sandbox Execution Panel */}
              <div className="rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-xl p-5 space-y-4 shadow-xl">
                <div className="border-b border-slate-800/60 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Sandbox Agent Evaluation</h3>
                  <p className="text-[10px] text-slate-500">Dispatch sandboxed tasks, evaluate responses, and update blockchain reputation credentials live.</p>
                </div>

                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Assign a prompt/directive to ${selectedAgentData.name}...`}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition-all"
                  rows={3}
                />

                <button
                  onClick={runTask}
                  disabled={executing || !prompt.trim()}
                  className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 text-xs font-semibold tracking-wide shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-white"
                >
                  {executing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-ping w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Executing LLM task & computing state hash...
                    </span>
                  ) : (
                    "Dispatch Directive"
                  )}
                </button>

                {taskError && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-400 animate-fadeIn flex flex-col gap-1">
                    <span className="font-semibold text-rose-500">Sandbox Execution Failed:</span>
                    <p>{taskError}</p>
                  </div>
                )}

                {lastTaskResult && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3.5 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Sandbox Run Summary</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded border font-mono font-semibold ${lastTaskResult.success
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                        {lastTaskResult.success ? "Passed Evaluation" : "Failed Heuristic Criteria"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-500">AI Response Output</span>
                      <p className="text-xs text-slate-300 bg-slate-950/90 border border-slate-900 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                        {lastTaskResult.response}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block">Reputation Delta</span>
                        <span className={`text-xs font-bold font-mono ${lastTaskResult.reputation.scoreDelta > 0 ? "text-emerald-400" : "text-rose-400"
                          }`}>
                          {lastTaskResult.reputation.scoreDelta >= 0
                            ? `+${lastTaskResult.reputation.scoreDelta.toFixed(1)}`
                            : lastTaskResult.reputation.scoreDelta.toFixed(1)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block">New Reputation Score</span>
                        <span className="text-xs font-bold font-mono text-slate-200">
                          {lastTaskResult.reputation.newScore.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-500">Cryptographic State Hash</span>
                      <div className="font-mono text-[10px] text-slate-400 break-all bg-slate-950 border border-slate-900 p-2 rounded-lg select-all">
                        {lastTaskResult.blockchain.stateHash}
                      </div>
                    </div>

                    {lastTaskResult.blockchain.txHash && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-500">Blockchain Anchor Receipt (Sepolia)</span>
                        <div className="font-mono text-[10px] text-indigo-300 break-all bg-slate-950 border border-slate-900 p-2 rounded-lg select-all">
                          {lastTaskResult.blockchain.txHash}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Passport Proof Details Panel */}
              <div className="rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-xl p-5 space-y-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Cryptographic Proof Credentials</h3>
                    <p className="text-[10px] text-slate-500">Deterministic ledger verification metrics.</p>
                  </div>
                  <button
                    onClick={() => selectedAgentId && loadVerificationProof(selectedAgentId, true)}
                    disabled={refreshingProof}
                    className="text-[10px] text-slate-400 hover:text-indigo-400 disabled:opacity-50 flex items-center gap-1 transition-all"
                  >
                    {refreshingProof ? (
                      <>
                        <span className="animate-spin inline-block mr-1">↻</span> Syncing...
                      </>
                    ) : (
                      "↻ Sync Proof"
                    )}
                  </button>
                </div>

                {verifyData && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-slate-500">Computed State Hash (Database State)</p>
                      <div className="font-mono text-[10px] text-slate-300 break-all bg-slate-950/60 border border-slate-900 p-2.5 rounded-lg select-all">
                        {verifyData.recomputedHash}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-slate-500">Anchored State Hash (Blockchain Ledger)</p>
                      <div className="font-mono text-[10px] text-slate-300 break-all bg-slate-950/60 border border-slate-900 p-2.5 rounded-lg select-all">
                        {verifyData.onChainHash ?? "Not yet anchored"}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs pt-2 border-t border-slate-800/40">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Database version</span>
                        <span className="font-mono text-slate-200 font-bold">{verifyData.agent?.stateVersion ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">On-chain version</span>
                        <span className="font-mono text-slate-200 font-bold">{verifyData.onChainVersion ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Verification status</span>
                        <span className={`font-semibold text-[10px] ${verifyData.isVerified ? "text-emerald-400" : "text-rose-400"
                          }`}>
                          {verifyData.isVerified ? "✓ Valid Signature" : "✗ Hash Mismatch"}
                        </span>
                      </div>
                    </div>

                    {verifyData.onChainUpdatedAt && (
                      <p className="text-[10px] text-slate-500 text-right">
                        Last blockchain checkpoint: {new Date(verifyData.onChainUpdatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {refreshProofError && (
                  <p className="text-[10px] text-rose-400 font-medium text-center">
                    Failed to sync: {refreshProofError}
                  </p>
                )}
              </div>

              {/* Task History Panel */}
              <div className="rounded-2xl border border-slate-900 bg-slate-900/40 backdrop-blur-xl p-5 space-y-4 shadow-xl">
                <div className="border-b border-slate-800/60 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Agent Historical Run Logs ({selectedAgentHistory.length})</h3>
                  <p className="text-[10px] text-slate-500">Append-only audit trail of historical runs and evaluations.</p>
                </div>

                {selectedAgentHistory.length === 0 ? (
                  <div className="rounded-xl border border-slate-900 bg-slate-950/40 p-6 text-center">
                    <p className="text-xs text-slate-500">No evaluations logged for this agent.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                    {selectedAgentHistory.map((run) => (
                      <div key={run.id} className="rounded-xl border border-slate-900 bg-slate-950/60 p-4 space-y-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-bold font-mono px-2 py-0.5 rounded border ${run.success
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
                          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Prompt input</span>
                          <p className="text-xs text-slate-300 font-mono italic bg-slate-950/40 border border-slate-900 p-2 rounded leading-relaxed">
                            "{run.prompt}"
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Response output</span>
                          <p className="text-xs text-slate-300 bg-slate-950/40 border border-slate-900 p-2 rounded leading-relaxed whitespace-pre-wrap">
                            {run.response}
                          </p>
                        </div>

                        <div className="flex justify-between items-center text-[10px] pt-1 text-slate-400">
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
          ) : (
            /* Selected Agent Empty State */
            <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl p-16 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-3xl font-mono">
                ？
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-300">No Agent Workspace Active</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Select an AI agent from the registry showcase panel to the left to dispatch directives, inspect cryptographic keys, and audit on-chain proofs.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

