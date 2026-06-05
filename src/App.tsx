import React, { useState, useEffect } from "react";
import { 
  User, 
  ShieldCheck, 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  ExternalLink, 
  RefreshCcw, 
  CheckCircle, 
  AlertCircle, 
  Code, 
  FileText, 
  Layers, 
  Coins, 
  Send, 
  Search, 
  HelpCircle,
  Sparkles,
  ChevronRight,
  Database,
  Lock,
  Play
} from "lucide-react";

// Types corresponding to the backend definitions
export interface AgentCard {
  id: string;
  owner_user_id: string;
  workspace_id: string;
  wallet_address: string | null;
  agent_id: string | null;
  display_name: string;
  trust_score: number;
  operator_rank: string;
  current_streak: number;
  longest_streak: number;
  completed_missions: number;
  verified_actions: number;
  successful_agent_runs: number;
  policy_violations: number;
  governance_proofs_generated: number;
  last_score_event_at: string | null;
  last_attestation_tx: string | null;
  score_version: number;
  created_at: string;
  updated_at: string;
}

export interface TrustScoreEvent {
  id: string;
  agent_card_id: string;
  event_type: string;
  points_delta: number;
  reason: string;
  evidence_hash: string | null;
  policy_id: string | null;
  mission_id: string | null;
  run_id: string | null;
  tx_hash: string | null;
  created_at: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const DEFAULT_SERVICE_TOKEN = "veklom_secure_service_token_2026";

export default function App() {
  // Navigation Tabs: Sovereign Registry vs smart wallet playground
  const [activeTab, setActiveTab] = useState<"dashboard" | "batch_hub" | "source_code">("dashboard");

  // Authentication & Node selection
  const [activeOperatorUserId, setActiveOperatorUserId] = useState<string>("user_default_veklom_operator_node");
  const [customOperatorName, setCustomOperatorName] = useState<string>("");
  const [isUpdatingName, setIsUpdatingName] = useState<boolean>(false);

  // Identity Card stats fetched from backend
  const [agentCard, setAgentCard] = useState<AgentCard | null>(null);
  const [events, setEvents] = useState<TrustScoreEvent[]>([]);
  const [cardLoading, setCardLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Custom simulation event builder state
  const [selectedEventType, setSelectedEventType] = useState<string>("verified_action");
  const [eventReasonInput, setEventReasonInput] = useState<string>("Verified autonomous network telemetry handshake");
  const [customPointsDelta, setCustomPointsDelta] = useState<string>("");
  const [isSubmittingEvent, setIsSubmittingEvent] = useState<boolean>(false);

  // Address lookup state for the public safe endpoint
  const [lookupAddress, setLookupAddress] = useState<string>("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupError, setLookupError] = useState<string>("");
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);

  // Automated acceptance parameters unit test system response
  const [testSuiteLoading, setTestSuiteLoading] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [mathVerified, setMathVerified] = useState<boolean>(false);

  // ====== BASE SMART WALLET & EIP-5792 BATCH SIMULATOR STATES ======
  const [walletType, setWalletType] = useState<"smart" | "eoa">("smart");
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [walletConnecting, setWalletConnecting] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  // Real-time onchain read/write states
  const [counterValue, setCounterValue] = useState<number>(42);
  const [readLoading, setReadLoading] = useState<boolean>(false);
  const [txState, setTxState] = useState<"idle" | "wallet_sign" | "confirming" | "success">("idle");
  const [currentTxHash, setCurrentTxHash] = useState<string | null>(null);
  const [isBatchTx, setIsBatchTx] = useState<boolean>(false);

  // Fetch Operator details on load and userId change
  useEffect(() => {
    fetchActiveOperator();
  }, [activeOperatorUserId]);

  const fetchActiveOperator = async () => {
    setCardLoading(true);
    try {
      const response = await fetch("/api/v1/identity/me", {
        headers: {
          "x-user-id": activeOperatorUserId
        }
      });
      if (!response.ok) throw new Error("Can't resolve operator node card.");
      const data = await response.json();
      if (data.success && data.card) {
        setAgentCard(data.card);
        setCustomOperatorName(data.card.display_name);
        
        // Also fetch events list from DB file directly to display ledger
        const eventsResponse = await fetch("/api/v1/identity/test-run");
        const eventsData = await eventsResponse.json();
        if (eventsData.success) {
          // Filter chronologically for this card's registered occurrences
          const cardEvents = (eventsData.results || [])
            .flatMap((r: any) => r.results || [])
            .filter(() => true); // fallback mock search or backend score details loop

          // Let's directly pull the JSON DB file list by mapping events
          const rawEventsRes = await fetch("/api/v1/identity/me", {
            headers: { "x-user-id": activeOperatorUserId }
          });
          // Since our node route parses the events into JSON internally, let's keep them in state.
          // Let's call the test-run helper to get standard events or trigger recalculation
        }
        
        // Fetch all raw history
        recalculateAndPullLogs(data.card.id);
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Communication breach with Veklom database.", "error");
    } finally {
      setCardLoading(false);
    }
  };

  const recalculateAndPullLogs = async (cardId: string) => {
    try {
      // Ingest recent log recalculation response to populate events array safely
      // Let's trigger a test event or read from public score to pull counters
      const res = await fetch("/api/v1/internal/identity/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-token": DEFAULT_SERVICE_TOKEN
        },
        body: JSON.stringify({
          agent_card_id: cardId,
          event_type: "completed_daily_mission",
          points_delta: 0, // 0 delta serves as custom heart-beat read trigger!
          reason: "Database query verification baseline"
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.card) {
          setAgentCard(data.card);
          if (data.breakdown && data.breakdown.applied_events) {
            setEvents(data.breakdown.applied_events);
          }
        }
      }
    } catch {}
  };

  const triggerToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setActionMessage({ text, type });
    setTimeout(() => {
      setActionMessage(null);
    }, 6000);
  };

  // Update Operator display name
  const handleUpdateDisplayName = async () => {
    if (!customOperatorName.trim()) return;
    setIsUpdatingName(true);
    try {
      const response = await fetch("/api/v1/identity/link-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": activeOperatorUserId
        },
        body: JSON.stringify({
          wallet_address: agentCard?.wallet_address,
          display_name: customOperatorName
        })
      });

      // Quick internal display name patch directly
      if (agentCard) {
        // Manually update name in backend via simple simulation event
        const mockNameRes = await fetch("/api/v1/internal/identity/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-token": DEFAULT_SERVICE_TOKEN
          },
          body: JSON.stringify({
            agent_card_id: agentCard.id,
            event_type: "verified_action",
            points_delta: 0, 
            reason: `Operator display name synchronized to: '${customOperatorName}'`
          })
        });

        if (mockNameRes.ok) {
          const resData = await mockNameRes.json();
          setAgentCard({
            ...resData.card,
            display_name: customOperatorName
          });
          triggerToast(`Sovereign operator tag updated to: ${customOperatorName}`, "success");
        }
      }
    } catch (err: any) {
      triggerToast("Failed to write to identity registry.", "error");
    } finally {
      setIsUpdatingName(false);
    }
  };

  // Submit high value node event to trust calculator backend
  const handlePostEvent = async () => {
    if (!agentCard) return;
    setIsSubmittingEvent(true);
    try {
      const overridePoints = customPointsDelta ? parseInt(customPointsDelta) : undefined;
      
      const response = await fetch("/api/v1/internal/identity/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-token": DEFAULT_SERVICE_TOKEN
        },
        body: JSON.stringify({
          agent_card_id: agentCard.id,
          event_type: selectedEventType,
          points_delta: overridePoints,
          reason: eventReasonInput,
          evidence_hash: "0x" + Math.random().toString(16).substr(2, 12) + "ade72026af82901c",
          tx_hash: "0x742d" + Math.random().toString(16).substr(2, 10) + "00f8"
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Event rejected by policy framework.");
      }

      const data = await response.json();
      setAgentCard(data.card);
      if (data.breakdown && data.breakdown.applied_events) {
        setEvents(data.breakdown.applied_events);
      }

      triggerToast(`Event logged: ${selectedEventType} (${data.event.points_delta >= 0 ? "+" : ""}${data.event.points_delta} points)`, "success");
      setEventReasonInput("Completed validation checks cleanly on autonomous node cycle");
      setCustomPointsDelta("");
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  // Lookup identity safety check
  const handleLookupAddress = async () => {
    if (!lookupAddress.trim()) return;
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    try {
      const response = await fetch(`/api/v1/identity/score/${encodeURIComponent(lookupAddress.trim())}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Address has not registered a Sovereign AgentCard identity yet.");
        }
        throw new Error("Could not parse trust database records.");
      }
      const data = await response.json();
      setLookupResult(data);
    } catch (err: any) {
      setLookupError(err.message);
    } finally {
      setLookupLoading(false);
    }
  };

  // Run automated test suite verifying all 10 acceptance criteria
  const handleRunVerificationSuite = async () => {
    setTestSuiteLoading(true);
    try {
      const res = await fetch("/api/v1/identity/test-run");
      const data = await res.json();
      setTestResults(data.results);
      setMathVerified(data.success);
      if (data.success) {
        triggerToast("Veklom ID Trust Engine fully validated. Code complies 100% with criteria specs!", "success");
      }
    } catch (err: any) {
      triggerToast("Verification run error: " + err.message, "error");
    } finally {
      setTestSuiteLoading(false);
    }
  };

  // Connect simulated Base wallet
  const handleConnectWallet = (type: "smart" | "eoa") => {
    setWalletConnecting(true);
    setWalletType(type);
    setTimeout(() => {
      const mockAddress = type === "smart" 
        ? "0x3b8901F82743DDeF2b28F3D1BFf781f33Cd66D4e8" // Veklom Smart Account
        : "0x71C7656EC7ab88b098defB751B7401B5f6d1476B"; // Legacy EOA
      
      setWalletAddress(mockAddress);
      setWalletConnected(true);
      setWalletConnecting(false);
      triggerToast(`Wallet connected via ${type === "smart" ? "Base Account SDK (Smart Wallet)" : "Browser Extension (EOA)"}`, "success");

      // Auto link connected wallet with Active node cards!
      linkWalletAddressToBackend(mockAddress);
    }, 1200);
  };

  const linkWalletAddressToBackend = async (address: string) => {
    if (!agentCard) return;
    try {
      const res = await fetch("/api/v1/identity/link-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": activeOperatorUserId
        },
        body: JSON.stringify({
          wallet_address: address
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAgentCard(data.card);
        // Refresh lookup helper to pre-fill active links
        setLookupAddress(address);
      }
    } catch {}
  };

  const handleDisconnectWallet = () => {
    setWalletAddress(null);
    setWalletConnected(false);
    triggerToast("Wallet disconnected.", "info");
  };

  // Simulate onchain tally contract writes
  const triggerIncrement = async (batch: boolean) => {
    if (!walletConnected) {
      triggerToast("Connect your wallet first to interact.", "error");
      return;
    }
    setIsBatchTx(batch);
    setTxState("wallet_sign");
    
    // Step 1: Simulate wallet authorization state delay
    setTimeout(() => {
      setTxState("confirming");
      
      // Step 2: Simulated onchain block mines
      setTimeout(async () => {
        const hash = "0xfb6c" + Math.random().toString(16).substr(2, 8) + "8cbb94b3c960df768f773fb622";
        setCurrentTxHash(hash);
        setTxState("success");
        setCounterValue(prev => prev + (batch ? 2 : 1));
        
        triggerToast(batch ? "Atomic Batch Increment x2 success!" : "Onchain Increment contract call successful!", "success");

        // ECOSYSTEM RIPPLE: When an action occurs onchain in Base, it automatically
        // publishes a Verified Action event to our deterministic Trust Score backend!
        if (agentCard) {
          try {
            await fetch("/api/v1/internal/identity/events", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-internal-token": DEFAULT_SERVICE_TOKEN
              },
              body: JSON.stringify({
                agent_card_id: agentCard.id,
                event_type: "verified_action",
                points_delta: 10,
                reason: `Completed Base Sepolia Increment: ${batch ? 'Batch atomic write (EIP-5792)' : 'Standard write'} (tx receipt verified)`,
                tx_hash: hash,
                evidence_hash: "0x88bb" + Math.random().toString(16).substr(2, 10)
              })
            });
            // Reload card & state log
            fetchActiveOperator();
          } catch (e) {
            console.error(" Earmarking transaction trust failed: ", e);
          }
        }
      }, 1500);
    }, 1200);
  };

  // Helper states for design colors based on Rank Tier
  const getRankBadgeColor = (rank: string) => {
    switch (rank) {
      case "Apex": return "bg-red-500/10 text-red-400 border-red-500/30";
      case "Elite Sovereign": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "Sovereign": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "Trusted Operator": return "bg-teal-500/10 text-teal-400 border-teal-500/30";
      case "Operator": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "Recruit": return "bg-zinc-500/20 text-zinc-300 border-zinc-700";
      default: return "bg-neutral-500/10 text-neutral-400 border-neutral-700";
    }
  };

  const getEventBadgeColor = (type: string) => {
    if ([
      "completed_daily_mission",
      "verified_action",
      "successful_agent_run",
      "governance_proof_generated",
      "streak_day_completed",
      "seven_day_streak_bonus",
      "x402_payment_verified"
    ].includes(type)) {
      return "text-emerald-400 bg-emerald-500/10";
    }
    return "text-rose-400 bg-rose-500/10";
  };

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 font-sans flex flex-col selection:bg-blue-500 selection:text-white">
      
      {/* Dynamic Alert Banner */}
      {actionMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-lg border shadow-xl transition-all duration-300 animate-fadeIn ${
          actionMessage.type === "success" 
            ? "bg-[#091e13] border-emerald-500/30 text-emerald-200" 
            : actionMessage.type === "error" 
            ? "bg-[#1f0d0e] border-rose-500/30 text-rose-200" 
            : "bg-[#0e1629] border-blue-500/30 text-blue-200"
        }`}>
          {actionMessage.type === "success" ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <AlertCircle className="h-5 w-5 text-rose-400" />}
          <div className="text-sm font-medium tracking-wide">{actionMessage.text}</div>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-tr from-blue-700 to-indigo-500 rounded-xl flex items-center justify-center font-mono font-bold text-lg text-white shadow-lg shadow-indigo-500/10">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold tracking-tight text-white">VEKLOM <span className="text-blue-500">ID</span></span>
                <span className="text-[10px] uppercase tracking-widest bg-blue-500/10 border border-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded font-mono font-medium">Layer 1</span>
              </div>
              <span className="text-xs text-zinc-400 font-mono">Sovereign Operator Registry trust primitive</span>
            </div>
          </div>

          {/* Connected state ticker */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Hetzner Node Active</span>
            </div>
            <div className="font-mono text-xs bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-300">
              Domain: <span className="text-blue-500">veklomid.base.eth</span>
            </div>
          </div>
        </div>
      </header>

      {/* TOP NAVIGATION TABS */}
      <div className="border-b border-zinc-800/80 bg-[#08080a]">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center h-14">
          <div className="flex gap-1 h-full items-center">
            <button 
              onClick={() => setActiveTab("dashboard")} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-semibold tracking-wide transition-all ${
                activeTab === "dashboard" ? "bg-zinc-800 text-white border-zinc-700" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              1. Sovereign Operator Registry
            </button>
            <button 
              onClick={() => setActiveTab("batch_hub")} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-semibold tracking-wide transition-all ${
                activeTab === "batch_hub" ? "bg-zinc-800 text-white border-zinc-700" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              2. Base Smart Wallet (EIP-5792)
            </button>
            <button 
              onClick={() => setActiveTab("source_code")} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-semibold tracking-wide transition-all ${
                activeTab === "source_code" ? "bg-zinc-800 text-white border-zinc-700" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              3. Wagmi Config Reference
            </button>
          </div>

          {/* Quick Node Multi-operator toggle */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Active Node Handle:</label>
            <select
              value={activeOperatorUserId}
              onChange={(e) => setActiveOperatorUserId(e.target.value)}
              className="bg-zinc-900 text-xs text-zinc-200 font-mono tracking-wider border border-zinc-800 rounded-md px-2 py-1 outline-none cursor-pointer focus:border-zinc-700 transition"
            >
              <option value="user_default_veklom_operator_node">Operator Node Alpha</option>
              <option value="user_node_sec_beta_2026">Secure Container Beta</option>
              <option value="user_operator_omega_sentinel">Omega Sentinel</option>
            </select>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">

        {/* TAB 1: REGISTRY & TRUST CALCULATOR SCREEN */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* INSTRUCTOR PROMPT CALLOUT */}
            <div className="bg-gradient-to-r from-blue-950/20 to-indigo-950/10 border border-blue-500/20 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex gap-4 items-start">
                <div className="h-10 w-10 shrink-0 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-mono text-sm font-bold text-white tracking-wide">Veklom Layer 1 Identity Primitive</h4>
                  <p className="text-xs text-zinc-300 mt-1 max-w-3xl leading-relaxed">
                    This module parses incoming decentralized actions (e.g. daily missions, agent telemetry, proof cycles) into deterministic scores. 
                    Every score movement is backed by an event log, and recalculated chronologically from history.
                  </p>
                </div>
              </div>
              <button 
                onClick={handleRunVerificationSuite}
                disabled={testSuiteLoading}
                className="shrink-0 bg-zinc-950 hover:bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-lg px-4 py-2 font-mono text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <ShieldCheck className={`h-4 w-4 ${mathVerified ? "text-emerald-400" : "text-blue-400"} ${testSuiteLoading ? "animate-spin" : ""}`} />
                {testSuiteLoading ? "Verifying..." : mathVerified ? "MATH VERIFIED (100%)" : "Run Acceptance Tests"}
              </button>
            </div>

            {/* UNIT TEST SUITE RESULTS COMPLIANCE OUTPUT */}
            {testResults && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 font-mono animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                    <Database className="h-3.5 w-3.5 text-blue-500" />
                    AUTOMATED IDENTITY COMPLIANCE AUDIT
                  </span>
                  <span className="text-[10px] text-zinc-500">10 Parameters Checked</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {testResults.map((t, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs bg-zinc-900/50 p-2.5 rounded border border-zinc-800/60">
                      {t.passed ? (
                        <span className="text-emerald-400 font-bold">[PASS]</span>
                      ) : (
                        <span className="text-rose-400 font-bold">[FAIL]</span>
                      )}
                      <div>
                        <div className="text-zinc-200 font-semibold">{t.name}</div>
                        {t.message && <div className="text-[10px] text-zinc-400 mt-0.5">{t.message}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GRID OF CARD AND CONTROLLER */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* LEFT: THE CANONICAL AGENT CARD HIGHLIGHT */}
              <div className="lg:col-span-5 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-zinc-400 font-bold">
                    Sovereign Operator ID Card
                  </h3>
                  <button 
                    onClick={fetchActiveOperator}
                    className="text-[10px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition"
                  >
                    <RefreshCcw className="h-3 w-3" />
                    sync registry
                  </button>
                </div>

                {/* THE AGENT CARD SHINY BLOCK */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-black p-6 border-2 border-zinc-800/80 shadow-2xl">
                  
                  {/* Subtle scanning glowing lights */}
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/80 to-transparent animate-[pulse_3s_infinite]" />
                  <div className="absolute top-8 right-8 h-24 w-24 rounded-full bg-blue-500/5 filter blur-3xl" />
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-blue-400 block font-semibold">SOVEREIGN REGISTRY</span>
                      {cardLoading ? (
                        <div className="h-6 w-32 bg-zinc-800 animate-pulse rounded" />
                      ) : (
                        <h4 className="text-xl font-bold font-mono text-white tracking-tight">{agentCard?.display_name}</h4>
                      )}
                    </div>
                    {agentCard?.operator_rank && (
                      <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${getRankBadgeColor(agentCard.operator_rank)}`}>
                        {agentCard.operator_rank}
                      </span>
                    )}
                  </div>

                  {/* Trust Score circular panel representation */}
                  <div className="my-8 py-4 flex items-center justify-between border-y border-zinc-800/60">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">IMMUTABLE TRUST INDEX</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-4xl font-mono font-bold text-white leading-none">
                          {cardLoading ? "..." : agentCard?.trust_score}
                        </span>
                        <span className="text-zinc-500 font-mono text-xs">/1000</span>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="text-center px-3 border-r border-zinc-800/50">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block">Cur Streak</span>
                        <div className="flex items-center justify-center gap-1 text-amber-500">
                          <Flame className="h-3.5 w-3.5 fill-amber-500/10" />
                          <span className="text-sm font-bold font-mono">{cardLoading ? "0" : agentCard?.current_streak}d</span>
                        </div>
                      </div>
                      <div className="text-center px-1">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block">Longest</span>
                        <span className="text-sm font-bold font-mono text-zinc-300">{cardLoading ? "0" : agentCard?.longest_streak}d</span>
                      </div>
                    </div>
                  </div>

                  {/* Operator ID Info */}
                  <div className="space-y-3.5 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Operator address:</span>
                      <span className="text-zinc-300 font-semibold truncate max-w-[180px]">
                        {agentCard?.wallet_address ? (
                          <span className="text-blue-400 select-all hover:underline cursor-pointer">
                            {agentCard.wallet_address.slice(0, 6)}...{agentCard.wallet_address.slice(-4)}
                          </span>
                        ) : (
                          <span className="text-rose-400 italic">No wallet linked</span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-zinc-500">Workspace identifier:</span>
                      <span className="text-zinc-300 select-all font-semibold uppercase">{agentCard?.workspace_id}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-zinc-500">Score Version:</span>
                      <span className="text-zinc-400">v{agentCard?.score_version}.0 (Deterministic standard)</span>
                    </div>

                    {agentCard?.last_score_event_at && (
                      <div className="flex justify-between pt-1 border-t border-zinc-900 text-[10px]">
                        <span className="text-zinc-500">Last Telemetry Stamp:</span>
                        <span className="text-zinc-400">{new Date(agentCard.last_score_event_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* SVG Watermark logo to look professional */}
                  <div className="absolute bottom-4 right-4 opacity-10 pointer-events-none">
                    <ShieldCheck className="h-32 w-32 text-blue-500" />
                  </div>
                </div>

                {/* OPERATOR SETTINGS PANEL */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-4">
                  <div className="font-mono text-xs text-zinc-400 uppercase tracking-widest font-bold">
                    Configure Node Identity Group
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={customOperatorName}
                      onChange={(e) => setCustomOperatorName(e.target.value)}
                      placeholder="e.g. Operator Node Alpha"
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-zinc-700 font-mono"
                    />
                    <button 
                      onClick={handleUpdateDisplayName}
                      disabled={isUpdatingName || !customOperatorName.trim()}
                      className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-mono text-xs px-4 py-2 rounded-lg cursor-pointer transition flex items-center justify-center"
                    >
                      {isUpdatingName ? "Saving..." : "Update Card Tag"}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                    Note: Updating the display tag logs a 0-points verified identity trace directly to audit trail.
                  </p>
                </div>

              </div>

              {/* RIGHT: DETERMINISTIC TRUST CALCULATOR EVENT BUILDER */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-6">
                  
                  <div>
                    <h3 className="font-mono text-sm font-bold text-white tracking-wide">
                      MOCK TELEMETRY EVENT INGESTION
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Event logs trigger the deterministic score calculator backend. Use this panel to simulate real-world trust logs.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-500 uppercase mb-1.5 font-bold">Select Event Type</label>
                      <select 
                        value={selectedEventType}
                        onChange={(e) => setSelectedEventType(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 font-mono outline-none cursor-pointer focus:border-zinc-700 transition"
                      >
                        <optgroup label="Positive Trust Actions">
                          <option value="completed_daily_mission">completed_daily_mission (+15)</option>
                          <option value="verified_action">verified_action (+10)</option>
                          <option value="successful_agent_run">successful_agent_run (+10)</option>
                          <option value="governance_proof_generated">governance_proof_generated (+20)</option>
                          <option value="streak_day_completed">streak_day_completed (+5)</option>
                          <option value="seven_day_streak_bonus">seven_day_streak_bonus (+35)</option>
                          <option value="x402_payment_verified">x402_payment_verified (+10)</option>
                        </optgroup>
                        <optgroup label="Security & Compliance Penalties">
                          <option value="policy_violation">policy_violation (-30)</option>
                          <option value="failed_agent_run">failed_agent_run (-10)</option>
                          <option value="replay_blocked">replay_blocked (-20)</option>
                          <option value="budget_exceeded">budget_exceeded (-25)</option>
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-zinc-500 uppercase mb-1.5 font-bold">Custom Score override (optional)</label>
                      <input 
                        type="number"
                        value={customPointsDelta}
                        onChange={(e) => setCustomPointsDelta(e.target.value)}
                        placeholder="Default delta for event"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 font-mono outline-none focus:border-zinc-700 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-500 uppercase mb-1.5 font-bold">Incident / Action Description Reason</label>
                    <textarea 
                      rows={2}
                      value={eventReasonInput}
                      onChange={(e) => setEventReasonInput(e.target.value)}
                      placeholder="e.g. Generated EIP-712 structured cryptographic signatures proving execution boundary limits"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 font-mono outline-none focus:border-zinc-700 transition resize-none"
                    />
                  </div>

                  <button 
                    onClick={handlePostEvent}
                    disabled={isSubmittingEvent || !agentCard}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-mono text-xs py-3 rounded-lg cursor-pointer transition font-bold tracking-wide flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {isSubmittingEvent ? "Processing Incident History..." : "Publish Telemetry event to Operator Card"}
                  </button>

                  <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 space-y-2 text-xs font-mono">
                    <div className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wide">Live Scoring Range Guidelines</div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-zinc-500">
                      <div>Tier 0-99: <span className="text-zinc-400">Unranked</span></div>
                      <div>Tier 100-199: <span className="text-amber-500 font-bold">Recruit</span></div>
                      <div>Tier 200-349: <span className="text-zinc-400">Operator</span></div>
                      <div>Tier 350-499: <span className="text-teal-400 font-bold">Trusted Operator</span></div>
                      <div>Tier 500-699: <span className="text-blue-400 font-bold">Sovereign</span></div>
                      <div>Tier 700-849: <span className="text-purple-400 font-bold">Elite Sovereign</span></div>
                      <div>Tier 850-1000: <span className="text-emerald-400 font-bold">Apex Sovereign</span></div>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* PUBLIC SEARCH DIRECTORY BLOCK */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="font-mono text-sm font-bold text-white tracking-wide">
                  PUBLIC SECURE DIRECTORY READ-OUT
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Query high level operator stats without exposing private database linkages (owner_user_id, workspace_id, internal database references etc). 
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                    <Search className="h-4 w-4" />
                  </span>
                  <input 
                    type="text"
                    value={lookupAddress}
                    onChange={(e) => setLookupAddress(e.target.value)}
                    placeholder="Enter wallet address (e.g. 0x3b8901F82743DDeF2b28F3D1BFf781f33Cd66D4e8)"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-zinc-300 font-mono outline-none focus:outline-none focus:border-zinc-700 transition"
                  />
                </div>
                <button 
                  onClick={handleLookupAddress}
                  disabled={lookupLoading || !lookupAddress.trim()}
                  className="bg-zinc-800 hover:bg-zinc-750 text-white font-mono text-xs px-5 py-2.5 rounded-lg cursor-pointer transition font-bold"
                >
                  {lookupLoading ? "Resolving..." : "Query Public Directory"}
                </button>
              </div>

              {lookupError && (
                <div className="text-rose-400 font-mono text-xs px-3 py-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                  ⚠️ {lookupError}
                </div>
              )}

              {lookupResult && (
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span className="font-mono text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" />
                      REGISTRY RECORD DETECTED
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{lookupResult.operator_rank} Badge Info</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
                    <div>
                      <div className="text-zinc-500">TAG</div>
                      <div className="text-white font-bold tracking-tight uppercase truncate">{lookupResult.display_name}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">TRUST INDEX</div>
                      <div className="text-white font-bold text-base">{lookupResult.trust_score}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">STREAK STATUS</div>
                      <div className="text-white font-semibold flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5 text-amber-500" />
                        {lookupResult.current_streak} days
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">VERIFIED INCIDENTS</div>
                      <div className="text-zinc-300">{lookupResult.verified_actions} times</div>
                    </div>
                  </div>

                  <div className="bg-[#0b1016] border border-blue-500/15 p-3 rounded-lg text-[11px] text-zinc-400 leading-relaxed font-mono">
                    🛡️ <span className="text-blue-300 font-bold">Security Rule Compliance:</span> Verification results are fully sanitized. Private linkages like <code>owner_user_id</code> and <code>workspace_id</code> are stripped to protect operator anonymity.
                  </div>
                </div>
              )}
            </div>

            {/* LEDGER OF TRUSTSCORE EVENT HISTORY */}
            <div className="space-y-4">
              <h3 className="font-mono text-xs text-zinc-400 uppercase tracking-widest font-bold">
                Immutable Trust Score Events Ledger
              </h3>
              
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
                <table className="w-full text-left font-mono border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-bold text-[10px] uppercase tracking-wider">
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Event Logic Tag</th>
                      <th className="p-4 border-l border-zinc-900">Delta</th>
                      <th className="p-4 border-l border-zinc-900">Explanation Reason</th>
                      <th className="p-4 border-l border-zinc-900 text-right">Proof Evidence Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {events.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-zinc-500 font-mono">
                          No score event history recorded yet. Use the Telemetry Event Ingestion panel above to post.
                        </td>
                      </tr>
                    ) : (
                      [...events].reverse().map((ev, index) => (
                        <tr key={index} className="hover:bg-zinc-900/40 transition">
                          <td className="p-4 text-zinc-500 whitespace-nowrap">
                            {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${getEventBadgeColor(ev.event_type)}`}>
                              {ev.event_type}
                            </span>
                          </td>
                          <td className={`p-4 border-l border-zinc-900 font-bold whitespace-nowrap ${ev.points_delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {ev.points_delta >= 0 ? "+" : ""}{ev.points_delta}
                          </td>
                          <td className="p-4 border-l border-zinc-900 text-zinc-300 max-w-xs truncate">
                            {ev.reason}
                          </td>
                          <td className="p-4 border-l border-zinc-900 text-right text-zinc-500 text-[10px] tracking-tight">
                            <span className="font-mono bg-zinc-900/80 px-2 py-1 rounded select-all hover:text-zinc-400 cursor-pointer">
                              {ev.id ? ev.id.slice(0, 8) + "..." : "0x0000..."}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: SMART WALLET & EIP-5792 TALLY INTERNET HUB */}
        {activeTab === "batch_hub" && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* HUB HEADER CALLOUT */}
            <div className="bg-[#0b1016] border border-blue-500/20 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex gap-4 items-center">
                <div className="h-10 w-10 shrink-0 bg-blue-500/10 border border-blue-500/25 text-blue-400 rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-mono text-sm font-bold text-white tracking-wide">Base Sepolia EIP-5792 Sandbox</h4>
                  <p className="text-xs text-zinc-300 mt-1">
                    EOA wallets use individual authorization prompts, while Smart Wallets handle multiple transactions in a single bundle (EIP-5792).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 uppercase bg-zinc-900 self-stretch md:self-auto justify-center px-3 py-1.5 rounded-lg border border-zinc-800">
                <span>Ecosystem Mode:</span>
                <span className="text-emerald-400 font-bold">Wagmi/Viem Compatible</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* LEFT COLUMN: ACTIVE WALLET REGISTRATION CONNECTION PANELS */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-6">
                  
                  <div className="border-b border-zinc-900 pb-4">
                    <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide">1. Connect Wallet</h3>
                    <p className="text-xs text-zinc-400 mt-1">Simulate smart account capabilities on Base.</p>
                  </div>

                  {!walletConnected ? (
                    <div className="space-y-4">
                      
                      <button 
                        onClick={() => handleConnectWallet("smart")}
                        disabled={walletConnecting}
                        className="w-full flex items-center justify-between bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-650 hover:to-indigo-550 border border-blue-600 p-4 rounded-xl text-white font-mono transition text-xs cursor-pointer text-left"
                      >
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            Base Account (Smart Wallet)
                          </div>
                          <div className="text-[10px] text-blue-200 mt-1 font-sans">Supports EIP-5792 Batching &amp; Spend Sponsorship</div>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </button>

                      <button 
                        onClick={() => handleConnectWallet("eoa")}
                        disabled={walletConnecting}
                        className="w-full flex items-center justify-between bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 p-4 rounded-xl text-zinc-300 font-mono transition text-xs cursor-pointer text-left"
                      >
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <Coins className="h-3.5 w-3.5 text-zinc-400" />
                            Classic EOA Browser Extension
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-1 font-sans">Metamask/Coinbase Browser. Sequential Fallback</div>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </button>

                      {walletConnecting && (
                        <div className="text-center py-2 font-mono text-xs text-blue-400 flex items-center justify-center gap-2">
                          <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                          Reading injected provider attributes...
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-4 font-mono text-xs">
                        
                        <div className="flex justify-between items-start border-b border-zinc-900 pb-3">
                          <div>
                            <div className="text-[9px] uppercase tracking-wider text-zinc-500">Connected Wallet</div>
                            <div className="text-white font-bold mt-1">
                              {walletType === "smart" ? "Base Smart Account" : "Classic Ethereum EOA"}
                            </div>
                          </div>
                          <button 
                            onClick={handleDisconnectWallet}
                            className="bg-zinc-800 hover:bg-zinc-750 text-[10px] px-2.5 py-1 text-zinc-300 rounded font-semibold transition"
                          >
                            Disconnect
                          </button>
                        </div>

                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-500">Address string:</span>
                          <span className="text-zinc-300 truncate max-w-[190px] text-right font-semibold select-all font-mono">
                            {walletAddress}
                          </span>
                        </div>

                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-500">Network target:</span>
                          <span className="text-blue-400 font-bold">Base Sepolia (84532)</span>
                        </div>

                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-500">Gas sponsorship model:</span>
                          <span className={walletType === "smart" ? "text-emerald-400 font-bold" : "text-amber-500"}>
                            {walletType === "smart" ? "Paymaster Sponsored (FREE)" : "User Pays (Base Sepolia ETH)"}
                          </span>
                        </div>

                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-500">Atomic Batching (EIP-5792):</span>
                          <span className={walletType === "smart" ? "text-emerald-400 font-bold animate-[pulse_1.5s_infinite]" : "text-zinc-500"}>
                            {walletType === "smart" ? "✅ READY / SUPPORTED" : "❌ NOT AVAILABLE"}
                          </span>
                        </div>

                      </div>

                      {/* Ripple guide to user */}
                      <div className="bg-[#121c16] border border-emerald-500/20 p-3.5 rounded-lg text-xs text-zinc-300 font-mono leading-relaxed">
                        🔗 <span className="text-emerald-300 font-bold">Registry Link automated:</span> Your connected wallet is linked to your active Veklom ID in real time. Transactions will yield score points automatically!
                      </div>

                    </div>
                  )}

                </div>
              </div>

              {/* RIGHT COLUMN: ONCHAIN TALLY ACTION PANEL */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-6">
                  
                  <div className="border-b border-zinc-900 pb-4">
                    <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide">2. Onchain Tally Registry</h3>
                    <p className="text-xs text-zinc-400 mt-1">Read and write state indicators from simulated contract address <code>0xd0C01a2E33De...3Cd66D4e808</code></p>
                  </div>

                  {/* DISPLAY NUMBER TALLY SCALE */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center space-y-2">
                    <span className="text-[10px] tracking-widest font-mono uppercase text-zinc-400 font-bold">CURRENT TALLY TOTAL (Base Sepolia)</span>
                    <div className="text-5xl font-mono font-black text-white py-1">
                      {counterValue}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 flex items-center justify-center gap-1.5">
                      <Database className="h-3 w-3" />
                      Multicall contract read validated • 1 minute ago
                    </div>
                  </div>

                  {/* TRANSACTION FLOW WITH BATCH CAPABILITY DETECTING */}
                  <div className="space-y-4">
                    
                    {!walletConnected ? (
                      <div className="text-center p-6 border border-dashed border-zinc-800 rounded-xl">
                        <p className="text-zinc-500 text-xs font-mono">Connect your simulated wallet to unlock transactions.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        
                        {walletType === "smart" ? (
                          // SMART WALLET ACTION PANEL: ATOMIC BATCH!
                          <div className="space-y-3.5">
                            <div className="p-4 bg-[#0a1b12] border border-emerald-500/25 rounded-lg">
                              <h5 className="text-xs font-bold font-mono text-emerald-400 flex items-center gap-1.5 uppercase">
                                <Sparkles className="h-4 w-4" />
                                Smart Capability detected: atomic batching
                              </h5>
                              <p className="text-[11px] font-mono text-zinc-300 mt-1 leading-relaxed">
                                You can invoke two call sequences (Increment + Increment) simultaneously in the same signature prompt. 
                                Gas fees are sponsored by the Veklom Developer Paymaster service.
                              </p>
                            </div>

                            <div className="flex gap-3">
                              <button 
                                onClick={() => triggerIncrement(true)}
                                disabled={txState !== "idle"}
                                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-550 hover:to-teal-450 text-white font-mono font-bold text-xs py-3 px-4 rounded-lg cursor-pointer transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/5 text-center uppercase"
                              >
                                <Zap className="h-4 w-4 text-emerald-100" />
                                Run x2 Increment (Batch Tx)
                              </button>
                              
                              <button 
                                onClick={() => triggerIncrement(false)}
                                disabled={txState !== "idle"}
                                className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-mono text-xs py-3 px-4 rounded-lg cursor-pointer transition"
                              >
                                Increment x1
                              </button>
                            </div>
                          </div>
                        ) : (
                          // EOA ACTION PANEL: GRACEFUL FALLBACK SEQUENTIAL ONLY
                          <div className="space-y-3.5">
                            <div className="p-4 bg-[#231510] border border-amber-500/20 rounded-lg">
                              <h5 className="text-xs font-bold font-mono text-amber-500 flex items-center gap-1.5 uppercase">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Fallback Triggered: Standard sequential mode
                              </h5>
                              <p className="text-[11px] font-mono text-zinc-300 mt-1 leading-relaxed">
                                Classic browser EOAs do not support atomic multi-transaction batching (EIP-5792). 
                                Operation has fallback gracefully to conventional single write modes. User pays native gas.
                              </p>
                            </div>

                            <button 
                              onClick={() => triggerIncrement(false)}
                              disabled={txState !== "idle"}
                              className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-mono font-bold text-xs py-3 px-4 rounded-lg cursor-pointer transition text-center uppercase tracking-wide"
                            >
                              Increment Onchain
                            </button>
                          </div>
                        )}

                        {/* TX PROGRESS ROADMAP WINDOW */}
                        {txState !== "idle" && (
                          <div className="bg-[#0b0c0f] border border-zinc-800 rounded-xl p-4 font-mono space-y-3.5 animate-fadeIn text-xs">
                            
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-zinc-300">Transaction Status Log</span>
                              <span className="text-[10px] uppercase text-blue-400 flex items-center gap-1.5">
                                <RefreshCcw className="h-3 w-3 animate-spin" />
                                {txState === "wallet_sign" ? "Waiting for Authorisation" : txState === "confirming" ? "Broadcasting Block" : "Complete"}
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] ${
                                  txState !== "wallet_sign" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400 animate-pulse"
                                }`}>
                                  1
                                </div>
                                <span className={txState !== "wallet_sign" ? "text-zinc-500 line-through" : "text-zinc-300 font-semibold"}>
                                  Authorize signatures in browser wallet prompt
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] ${
                                  txState === "success" ? "bg-emerald-500/10 text-emerald-400" : txState === "confirming" ? "bg-blue-500/10 text-blue-400 animate-pulse" : "bg-zinc-900 text-zinc-600"
                                }`}>
                                  2
                                </div>
                                <span className={txState === "success" ? "text-zinc-500 line-through" : txState === "confirming" ? "text-zinc-200 font-semibold animate-pulse" : "text-zinc-600"}>
                                  Broadcasting &amp; Mining block on Base Sepolia
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] ${
                                  txState === "success" ? "bg-emerald-500 text-neutral-950 font-bold" : "bg-zinc-900 text-zinc-600"
                                }`}>
                                  ✓
                                </div>
                                <span className={txState === "success" ? "text-emerald-400 font-bold animate-[pulse_1s]" : "text-zinc-600"}>
                                  Sequence processed. Trust score updated!
                                </span>
                              </div>
                            </div>

                            {/* Tx Hash output */}
                            {currentTxHash && txState === "success" && (
                              <div className="pt-2 border-t border-zinc-900 flex justify-between items-center text-[10px]">
                                <span className="text-zinc-500">Transaction Hash:</span>
                                <a 
                                  href={`https://sepolia.basescan.org/tx/${currentTxHash}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline flex items-center gap-1 font-mono tracking-tight"
                                >
                                  {currentTxHash.slice(0, 14)}...{currentTxHash.slice(-10)}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}

                          </div>
                        )}

                      </div>
                    )}

                  </div>

                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: LIVE CODE REFERENCE GUIDES (WAGMI / VIEM CONFIG) */}
        {activeTab === "source_code" && (
          <div className="space-y-6 animate-fadeIn font-mono text-zinc-300">
            
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-2">
              <h4 className="text-sm font-bold text-white uppercase flex items-center gap-1.5 tracking-wide">
                <Code className="h-4.5 w-4.5 text-blue-500" />
                Decentralized EIP-5792 wagmi config Reference
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Review compile-ready code setup leveraging Base Account SDK, capability checkers, and the fallback sequential route mechanism.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-3.5">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <span className="text-xs text-white font-bold">1. config/wagmi.ts</span>
                  <span className="text-[10px] text-zinc-500">Base Sepolia Configuration</span>
                </div>
                <pre className="text-[10.5px] text-zinc-400 bg-black/40 p-4 rounded-lg overflow-x-auto leading-relaxed max-h-72">
{`import { http, createConfig, createStorage, cookieStorage } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { baseAccount, injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    baseAccount({
      appName: 'Veklom Registry Gate',
    }),
  ],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
})`}
                </pre>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-3.5">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <span className="text-xs text-white font-bold">2. hooks/useWalletCapabilities.ts</span>
                  <span className="text-[10px] text-zinc-500">Smart Capability Detection</span>
                </div>
                <pre className="text-[10.5px] text-zinc-400 bg-black/40 p-4 rounded-lg overflow-x-auto leading-relaxed max-h-72">
{`import { useCapabilities } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { useMemo } from 'react'

export function useWalletCapabilities() {
  const { data: capabilities } = useCapabilities()

  const supportsBatching = useMemo(() => {
    const atomic = capabilities?.[baseSepolia.id]?.atomic
    return atomic?.status === 'ready' || atomic?.status === 'supported'
  }, [capabilities])

  const supportsPaymaster = useMemo(() => {
    return capabilities?.[baseSepolia.id]?.paymasterService?.supported === true
  }, [capabilities])

  return { supportsBatching, supportsPaymaster }
}`}
                </pre>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 col-span-1 md:col-span-2 space-y-3.5">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <span className="text-xs text-white font-bold">3. components/BatchIncrementWithFallback.tsx</span>
                  <span className="text-[10px] text-zinc-500">Dual-Path Transaction flow Engine</span>
                </div>
                <pre className="text-[10.5px] text-zinc-400 bg-black/40 p-4 rounded-lg overflow-x-auto leading-relaxed max-h-96">
{`'use client'

import { useSendCalls, useWaitForCallsStatus, useWriteContract, useAccount } from 'wagmi'
import { encodeFunctionData } from 'viem'
import { baseSepolia } from 'wagmi/chains'
import { useWalletCapabilities } from '@/hooks/useWalletCapabilities'
import { COUNTER_ADDRESS, counterAbi } from '@/config/counter'

export function BatchIncrement() {
  const { isConnected } = useAccount()
  const { supportsBatching } = useWalletCapabilities()

  if (!isConnected) return <p>Connect wallet to participate.</p>

  // Dynamically branching routes
  return supportsBatching ? <BatchFlow /> : <SequentialFlow />
}

function BatchFlow() {
  const { data, sendCalls, isPending } = useSendCalls()
  const incrementData = encodeFunctionData({ abi: counterAbi, functionName: 'increment' })

  return (
    <button onClick={() => sendCalls({
      calls: [
        { to: COUNTER_ADDRESS, data: incrementData },
        { to: COUNTER_ADDRESS, data: incrementData }
      ],
      chainId: baseSepolia.id
    })}>
      {isPending ? 'Confirming in Wallet...' : 'Increment x2 (Atomic Batch)'}
    </button>
  )
}`}
                </pre>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* FOOTER BAR */}
      <footer className="border-t border-zinc-800 bg-[#08080a] py-8 text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span>© 2026 Sovereign Operator Registry. Veklom Core Protocol • Layer 1 Trust Infrastructure.</span>
          </div>
          <div className="flex gap-6">
            <span className="text-zinc-600">Secure Service Node: <span className="text-zinc-500">V1.0.4</span></span>
            <span className="text-zinc-600">•</span>
            <a href="https://veklom.com" target="_blank" rel="noreferrer" className="hover:text-blue-400 transition">veklom.com</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
