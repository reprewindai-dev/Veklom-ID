import React from "react";
import { Sparkles, MessageSquare, Layers, BookOpen } from "lucide-react";
import { taskPresets } from "../presets";
import { TaskPreset } from "../types";

interface SystemPresetsProps {
  onSelectPreset: (preset: TaskPreset) => void;
  activePresetId: string | null;
  disabled: boolean;
}

export default function SystemPresets({ onSelectPreset, activePresetId, disabled }: SystemPresetsProps) {
  return (
    <div className="bg-[#121214] border border-[#27272a] rounded-xl p-4 font-sans space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <h3 className="font-sans font-semibold tracking-tight uppercase text-zinc-200 text-xs">
          LOAD MODULE PRESET COMBOS
        </h3>
      </div>
      
      <p className="text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
        Quickly load team parameters, customized role directives, and specialized dialogue workflow pipelines.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {taskPresets.map((preset) => (
          <button
            id={`preset-card-${preset.id}`}
            key={preset.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPreset(preset)}
            className={`text-left p-3 rounded border transition-all duration-200 flex flex-col justify-between ${
              disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
            } ${
              activePresetId === preset.id
                ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500"
                : "border-[#27272a] bg-[#0c0c0e] hover:bg-[#16161a] hover:border-zinc-700"
            }`}
          >
            <div className="space-y-1.5 w-full">
              <div className="flex items-center justify-between gap-2">
                <span className="font-sans font-semibold text-zinc-200 text-xs truncate">
                  {preset.title}
                </span>
                <span className={`font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                  preset.mode === "debate" ? "bg-amber-500/5 text-amber-400 border-amber-500/20" :
                  preset.mode === "pipeline" ? "bg-teal-500/5 text-teal-400 border-teal-500/20" :
                  "bg-blue-500/5 text-blue-400 border-blue-500/20"
                }`}>
                  {preset.mode === "group_chat" ? "group" : preset.mode}
                </span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-snug line-clamp-2">
                {preset.description}
              </p>
            </div>

            {/* Micro Team size badge */}
            <div className="mt-2.5 pt-2 border-t border-[#27272a] flex items-center justify-between w-full">
              <span className="text-[9px] text-[#71717a] font-mono uppercase tracking-wider">TEAM PROFILE</span>
              <div className="flex items-center -space-x-1 overflow-hidden">
                {preset.agents.map((agent, index) => (
                  <div
                    id={`preset-avatar-${preset.id}-${index}`}
                    key={agent.id}
                    title={`${agent.name} (${agent.role})`}
                    className="w-4.5 h-4.5 rounded-full border border-[#27272a] bg-[#121214] flex items-center justify-center text-[10px] select-none"
                  >
                    {agent.emoji}
                  </div>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
