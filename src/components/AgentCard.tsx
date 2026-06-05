import React, { useState } from "react";
import { Edit3, Check, Trash2, Sliders, Eye, EyeOff } from "lucide-react";
import { Agent } from "../types";

interface AgentCardProps {
  agent: Agent;
  onUpdate: (updated: Agent) => void;
  onDelete: (id: string) => void;
  isSimulating: boolean;
}

const COLORS = ["amber", "emerald", "indigo", "rose", "cyan", "teal", "violet", "blue", "pink"];
const EMOJIS = ["🧠", "🚀", "💼", "🕵️", "🤝", "🎨", "📣", "🌌", "🎭", "💻", "🧬", "📜", "⚖️", "🦄"];

export default function AgentCard({ agent, onUpdate, onDelete, isSimulating }: AgentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt);
  const [temperature, setTemperature] = useState(agent.temperature);
  const [emoji, setEmoji] = useState(agent.emoji);
  const [color, setColor] = useState(agent.color);

  const handleSave = () => {
    onUpdate({
      ...agent,
      name: name.trim() || agent.name,
      role: role.trim() || agent.role,
      systemPrompt: systemPrompt.trim() || agent.systemPrompt,
      temperature,
      emoji,
      color
    });
    setIsEditing(false);
  };

  const handleToggle = () => {
    onUpdate({
      ...agent,
      isEnabled: !agent.isEnabled
    });
  };

  const getColorClasses = (clr: string) => {
    const map: Record<string, { border: string; bg: string; text: string; ring: string }> = {
      amber: { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/20" },
      emerald: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "ring-emerald-500/20" },
      indigo: { border: "border-indigo-500/30", bg: "bg-indigo-500/10", text: "text-indigo-400", ring: "ring-indigo-500/20" },
      rose: { border: "border-rose-500/30", bg: "bg-rose-500/10", text: "text-rose-400", ring: "ring-rose-500/20" },
      cyan: { border: "border-cyan-500/30", bg: "bg-cyan-500/10", text: "text-cyan-400", ring: "ring-cyan-500/20" },
      teal: { border: "border-teal-500/30", bg: "bg-teal-500/10", text: "text-teal-400", ring: "ring-teal-500/20" },
      violet: { border: "border-violet-500/30", bg: "bg-violet-500/10", text: "text-violet-400", ring: "ring-violet-500/20" },
      blue: { border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-400", ring: "ring-blue-500/20" },
      pink: { border: "border-pink-500/30", bg: "bg-pink-500/10", text: "text-pink-400", ring: "ring-pink-500/20" },
    };
    return map[clr] || { border: "border-zinc-800", bg: "bg-zinc-800", text: "text-zinc-450", ring: "ring-zinc-800" };
  };

  const classes = getColorClasses(agent.color);

  return (
    <div
      id={`agent-card-${agent.id}`}
      className={`relative rounded border bg-[#121214] p-3 transition-all duration-300 ${
        agent.isEnabled
          ? `border-[#27272a] border-l-2 border-l-${agent.color}-500 opacity-100`
          : "border-[#27272a] opacity-40"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar block */}
        <div className="flex-none">
          <div className={`w-8 h-8 rounded flex items-center justify-center text-lg bg-[#0c0c0e] border border-[#27272a] ${classes.text}`}>
            {agent.emoji}
          </div>
        </div>

        {/* Name and State info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-sans font-semibold text-zinc-200 text-xs truncate">
              {agent.name}
            </h4>

            {/* Action Group */}
            <div className="flex items-center gap-1 flex-none">
              <button
                id={`btn-toggle-${agent.id}`}
                onClick={handleToggle}
                disabled={isSimulating}
                className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-[#1c1c1f] disabled:opacity-40 cursor-pointer"
                title={agent.isEnabled ? "Disable Agent" : "Enable Agent"}
              >
                {agent.isEnabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </button>
              <button
                id={`btn-edit-${agent.id}`}
                onClick={() => !isSimulating && setIsEditing(!isEditing)}
                disabled={isSimulating}
                className={`p-1 rounded disabled:opacity-40 cursor-pointer ${
                  isEditing ? "text-indigo-400 bg-[#1c1c1f]" : "text-zinc-500 hover:text-zinc-200 hover:bg-[#1c1c1f]"
                }`}
                title="Edit agent payload"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                id={`btn-delete-${agent.id}`}
                onClick={() => onDelete(agent.id)}
                disabled={isSimulating}
                className="p-1 rounded text-zinc-500 hover:text-rose-450 hover:bg-rose-500/10 disabled:opacity-40 cursor-pointer"
                title="Remove Agent"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          <span className={`inline-block font-mono text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-[#0c0c0e] border border-[#27272a] ${classes.text}`}>
            {agent.role}
          </span>

          {!isEditing && (
            <p className="mt-1 text-[11px] text-zinc-400 leading-snug line-clamp-2">
              {agent.systemPrompt}
            </p>
          )}
        </div>
      </div>

      {/* Slide Edit form inside card */}
      {isEditing && (
        <div className="mt-3 pt-2.5 border-t border-[#27272a] space-y-2.5 font-sans text-[11px] animate-fadeIn text-zinc-300">
          <div>
            <label className="block text-[8px] font-mono uppercase tracking-widest text-zinc-500 mb-0.5">
              Agent Name
            </label>
            <input
              id={`edit-name-${agent.id}`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-7 px-2 rounded bg-[#09090b] border border-[#27272a] text-zinc-100 placeholder-zinc-700 font-mono text-[11px] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[8px] font-mono uppercase tracking-widest text-zinc-500 mb-0.5">
              Specialized Role / Tag
            </label>
            <input
              id={`edit-role-${agent.id}`}
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-7 px-2 rounded bg-[#09090b] border border-[#27272a] text-zinc-100 placeholder-zinc-700 font-mono text-[11px] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">
                Temperature (Creativity)
              </label>
              <span className="font-mono text-[10px] font-bold text-indigo-400">
                {temperature.toFixed(2)}
              </span>
            </div>
            <input
              id={`edit-temp-${agent.id}`}
              type="range"
              min="0.1"
              max="1.2"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1 bg-[#09090b] rounded appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[8px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
              Select Icon & Style Color
            </label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {EMOJIS.map((emo) => (
                <button
                  id={`btn-emoji-${agent.id}-${emo}`}
                  key={emo}
                  type="button"
                  onClick={() => setEmoji(emo)}
                  className={`w-5.5 h-5.5 flex items-center justify-center rounded text-xs bg-[#09090b] border border-[#27272a] hover:bg-[#16161a] ${
                    emoji === emo ? "border-indigo-500 text-indigo-400/90" : ""
                  }`}
                >
                  {emo}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {COLORS.map((clr) => (
                <button
                  id={`btn-color-${agent.id}-${clr}`}
                  key={clr}
                  type="button"
                  onClick={() => setColor(clr)}
                  className={`w-3 h-3 rounded-full bg-${clr}-500 border border-[#090900]/40 hover:opacity-85 ${
                    color === clr ? "border-zinc-300 scale-120" : "border-transparent"
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[8px] font-mono uppercase tracking-widest text-[#71717a] mb-0.5">
              System Instruction Prompt
            </label>
            <textarea
              id={`edit-prompt-${agent.id}`}
              value={systemPrompt}
              rows={2.5}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full p-2 rounded bg-[#09090b] border border-[#27272a] text-zinc-100 placeholder-zinc-700 font-sans focus:outline-none focus:border-indigo-500 leading-normal"
            />
          </div>

          <div className="flex items-center gap-1.5 pt-1 ml-auto justify-end">
            <button
              id={`btn-cancel-${agent.id}`}
              onClick={() => setIsEditing(false)}
              className="px-2 py-1 rounded bg-[#1c1c1f] text-zinc-400 hover:bg-[#27272a] hover:text-zinc-200 transition cursor-pointer text-[10px] uppercase font-mono"
            >
              Cancel
            </button>
            <button
              id={`btn-save-${agent.id}`}
              onClick={handleSave}
              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition flex items-center gap-1 cursor-pointer text-[10px] uppercase font-mono"
            >
              <Check className="w-2.5 h-2.5" /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
