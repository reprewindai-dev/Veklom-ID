import React from "react";
import { Play, Pause, RotateCcw, ArrowRight, Layers, MessageSquare, Flame } from "lucide-react";
import { SimulationMode, SimulationState } from "../types";

interface SimulationControlsProps {
  task: string;
  setTask: (task: string) => void;
  mode: SimulationMode;
  setMode: (mode: SimulationMode) => void;
  simulationState: SimulationState;
  onStart: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  activeAgentsCount: number;
  messageCount: number;
}

export default function SimulationControls({
  task,
  setTask,
  mode,
  setMode,
  simulationState,
  onStart,
  onPause,
  onStep,
  onReset,
  activeAgentsCount,
  messageCount,
}: SimulationControlsProps) {

  return (
    <div className="bg-[#121214] border border-[#27272a] rounded-xl p-4 shadow-sm space-y-4 font-sans text-zinc-200">
      {/* Simulation configuration headers */}
      <div className="space-y-3.5">
        <div>
          <label className="block text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1.5">
            01_ SELECT DIALOGUE STRUCT PIPELINE
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              id="mode-debate-btn"
              type="button"
              onClick={() => simulationState === "idle" && setMode("debate")}
              disabled={simulationState !== "idle"}
              className={`flex flex-col items-center p-2 rounded border text-center transition cursor-pointer ${
                mode === "debate"
                  ? "border-amber-500 bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30"
                  : "border-[#27272a] bg-[#0c0c0e] text-zinc-400 hover:bg-[#16161a] hover:border-[#3f3f46]"
              } disabled:opacity-40`}
            >
              <MessageSquare className="w-3.5 h-3.5 mb-0.5 text-amber-400" />
              <span className="font-sans font-semibold text-[11px]">DEBATE</span>
              <span className="font-mono text-[8px] text-zinc-500 mt-0.5">Dialectical challenge</span>
            </button>

            <button
              id="mode-pipeline-btn"
              type="button"
              onClick={() => simulationState === "idle" && setMode("pipeline")}
              disabled={simulationState !== "idle"}
              className={`flex flex-col items-center p-2 rounded border text-center transition cursor-pointer ${
                mode === "pipeline"
                  ? "border-teal-500 bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/30"
                  : "border-[#27272a] bg-[#0c0c0e] text-zinc-400 hover:bg-[#16161a] hover:border-[#3f3f46]"
              } disabled:opacity-40`}
            >
              <Layers className="w-3.5 h-3.5 mb-0.5 text-teal-400" />
              <span className="font-sans font-semibold text-[11px]">PIPELINE</span>
              <span className="font-mono text-[8px] text-zinc-500 mt-0.5">Sequential hand-off</span>
            </button>

            <button
              id="mode-group-btn"
              type="button"
              onClick={() => simulationState === "idle" && setMode("group_chat")}
              disabled={simulationState !== "idle"}
              className={`flex flex-col items-center p-2 rounded border text-center transition cursor-pointer ${
                mode === "group_chat"
                  ? "border-blue-500 bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30"
                  : "border-[#27272a] bg-[#0c0c0e] text-zinc-400 hover:bg-[#16161a] hover:border-[#3f3f46]"
              } disabled:opacity-40`}
            >
              <MessageSquare className="w-3.5 h-3.5 mb-0.5 text-blue-400" />
              <span className="font-sans font-semibold text-[11px]">GROUP CHAT</span>
              <span className="font-mono text-[8px] text-zinc-500 mt-0.5">Round-Robin loop</span>
            </button>
          </div>
          {/* Mode explanation */}
          <div className="mt-1.5 p-2 bg-[#0c0c0e] border border-[#27272a] rounded">
            <p className="text-zinc-400 font-sans text-[11px] leading-snug">
              {mode === "debate" && (
                <>
                  <span className="font-semibold text-amber-400 uppercase font-mono tracking-wider text-[9px] mr-1">[DEBATE MODE]</span> Dialectical arena. Turn 1 establishes the topic; subsequent agents challenge, isolate flaws, and construct counter-theories.
                </>
              )}
              {mode === "pipeline" && (
                <>
                  <span className="font-semibold text-teal-400 uppercase font-mono tracking-wider text-[9px] mr-1">[PIPELINE MODE]</span> Structured build stream. Agent 1 drafts, Agent 2 refines/packages, and Agent 3 executes critical vulnerability analyses.
                </>
              )}
              {mode === "group_chat" && (
                <>
                  <span className="font-semibold text-blue-400 uppercase font-mono tracking-wider text-[9px] mr-1">[GROUP MODE]</span> Horizontal workshop. Agents formulate synergistic solutions, building suggestions sequentially onto previous context.
                </>
              )}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-[8px] font-mono uppercase tracking-widest text-zinc-500 text-zinc-400 font-bold mb-1">
            02_ CORE HYPOTHESIS & DIRECTIVE DEFINITION
          </label>
          <textarea
            id="simulation-task-input"
            value={task}
            onChange={(e) => simulationState === "idle" && setTask(e.target.value)}
            disabled={simulationState !== "idle"}
            maxLength={600}
            rows={2.5}
            placeholder="Input directive target (e.g., Explain advanced materials debate validation...)"
            className="w-full p-2.5 rounded border border-[#27272a] bg-[#0c0c0e] font-mono text-zinc-200 placeholder-zinc-600 leading-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs disabled:opacity-50"
          />
        </div>
      </div>

      {/* Workspace live statistics display */}
      <div className="flex items-center justify-between py-2 px-3 bg-[#0c0c0e] border border-[#27272a] rounded font-mono text-[10px] text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span>AGENTS_ACTIVE: <strong className="text-zinc-200">{activeAgentsCount}</strong></span>
        </div>
        <div className="w-[1px] h-3 bg-[#27272a]" />
        <div>
          <span>PACKETS_TRANSLATED: <strong className="text-zinc-200">{messageCount}</strong></span>
        </div>
        <div className="w-[1px] h-3 bg-[#27272a]" />
        <div className="text-indigo-400 font-mono font-bold uppercase text-[9px]">
          {simulationState}
        </div>
      </div>

      {/* Command trigger elements */}
      <div className="flex flex-wrap gap-2 pt-1 font-mono uppercase text-xs">
        {simulationState === "running" ? (
          <button
            id="sim-action-pause-btn"
            onClick={onPause}
            className="flex-1 min-w-[110px] h-9 px-3 rounded font-semibold bg-amber-600 hover:bg-amber-700 text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" /> PAUSE RUN
          </button>
        ) : (
          <button
            id="sim-action-start-btn"
            onClick={onStart}
            disabled={activeAgentsCount < 1 || !task.trim()}
            className="flex-1 min-w-[110px] h-9 px-3 rounded font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> START COMPILE
          </button>
        )}

        <button
          id="sim-action-step-btn"
          onClick={onStep}
          disabled={simulationState === "running" || activeAgentsCount < 1 || !task.trim()}
          className="px-3 h-9 rounded font-semibold border border-indigo-500/20 text-indigo-400 bg-indigo-950/10 hover:bg-indigo-950/30 transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title="Manually trigger the next agent turn"
        >
          <span>STEP BACKEND</span> <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <button
          id="sim-action-reset-btn"
          onClick={onReset}
          className="p-2 h-9 rounded border border-[#27272a] text-zinc-500 bg-[#0c0c0e] hover:bg-[#16161a] transition flex items-center justify-center cursor-pointer"
          title="Reset conversation dialogue history"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
