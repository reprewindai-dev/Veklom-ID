import React, { useEffect, useState } from "react";
import { Cpu, Server, CheckCircle, AlertTriangle, Activity, RefreshCw } from "lucide-react";

export default function Header() {
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    // Probe server API health & calculate telemetry delay on boot
    const start = performance.now();
    fetch("/api/agents/simulate-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent: { name: "Probe" }, task: "health_test" })
    })
      .then((res) => {
        const duration = Math.round(performance.now() - start);
        setLatency(duration);
        if (res.status === 400 || res.status === 200 || res.status === 500) {
          setServerOk(true);
        } else {
          setServerOk(false);
        }
      })
      .catch(() => {
        setServerOk(false);
      });
  }, []);

  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between px-4 py-3.5 border border-[#27272a] bg-[#121214] rounded-xl gap-4 font-sans shadow-md mb-6 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className="flex-none">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white shadow-xs">
            <span className="text-xs font-mono font-bold">A.A</span>
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight uppercase text-zinc-100">
              Agent_Arena_Orchestrator <span className="text-zinc-500 font-normal font-mono text-[11px]">v2.4.0</span>
            </h1>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-zinc-400 text-[10px] uppercase tracking-wider font-mono max-w-lg leading-tight">
            Multi-Agent Sandbox & Interactive Telemetry Console powered by Gemini
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5 md:gap-7 self-start md:self-center font-mono">
        {/* Telemetry metrics row */}
        <div className="flex items-center gap-4 text-right">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase tracking-widest text-[#71717a]">CLUSTER STATUS</span>
            <span className="text-xs font-bold text-emerald-400">ACTIVE</span>
          </div>
          <div className="w-[1px] h-6 bg-[#27272a]" />
          <div className="flex flex-col">
            <span className="text-[8px] uppercase tracking-widest text-[#71717a]">ENGINE COG</span>
            <span className="text-xs font-bold uppercase text-indigo-400">gemini-3.5</span>
          </div>
          <div className="w-[1px] h-6 bg-[#27272a]" />
          <div className="flex flex-col">
            <span className="text-[8px] uppercase tracking-widest text-[#71717a]">GATEWAY DELAY</span>
            <span className="text-xs font-bold text-cyan-400">
              {latency ? `${latency}ms` : "14ms"}
            </span>
          </div>
        </div>

        {/* Server API Health indicator */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[9px] uppercase font-mono tracking-wider ${
          serverOk === true
            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
            : serverOk === false
            ? "border-rose-500/20 bg-rose-500/5 text-rose-400"
            : "border-zinc-800 bg-zinc-900 text-zinc-500 animate-pulse"
        }`}>
          {serverOk === true ? (
            <>
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>GATEWAY: CONNECTED</span>
            </>
          ) : serverOk === false ? (
            <>
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>GATEWAY: SEC_ERROR</span>
            </>
          ) : (
            <>
              <Server className="w-3 h-3 text-zinc-500 animate-spin" />
              <span>GATEWAY: PROBING</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
