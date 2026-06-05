import React, { useState } from "react";
import Markdown from "react-markdown";
import { Copy, Check } from "lucide-react";
import { Message } from "../types";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert logical colors to Tailwind styles safely
  const getColorStyles = (color: string) => {
    const map: Record<string, { bg: string; text: string; border: string; accent: string }> = {
      amber: { bg: "bg-amber-500/5", text: "text-amber-400 border-amber-500/25", border: "border-[#27272a]", accent: "bg-amber-500" },
      emerald: { bg: "bg-emerald-500/5", text: "text-emerald-400 border-emerald-500/25", border: "border-[#27272a]", accent: "bg-emerald-500" },
      indigo: { bg: "bg-indigo-500/5", text: "text-indigo-400 border-indigo-500/25", border: "border-[#27272a]", accent: "bg-indigo-500" },
      rose: { bg: "bg-rose-500/5", text: "text-rose-400 border-rose-500/25", border: "border-[#27272a]", accent: "bg-rose-500" },
      cyan: { bg: "bg-cyan-500/5", text: "text-cyan-400 border-cyan-500/25", border: "border-[#27272a]", accent: "bg-cyan-500" },
      teal: { bg: "bg-teal-500/5", text: "text-teal-400 border-teal-500/25", border: "border-[#27272a]", accent: "bg-teal-500" },
      violet: { bg: "bg-violet-500/5", text: "text-violet-400 border-violet-500/25", border: "border-[#27272a]", accent: "bg-violet-500" },
      blue: { bg: "bg-blue-500/5", text: "text-blue-400 border-blue-500/25", border: "border-[#27272a]", accent: "bg-blue-500" },
      pink: { bg: "bg-pink-500/5", text: "text-pink-400 border-pink-500/25", border: "border-[#27272a]", accent: "bg-pink-500" },
    };
    return map[color] || { bg: "bg-zinc-900/40", text: "text-zinc-300 border-zinc-800", border: "border-[#27272a]", accent: "bg-zinc-500" };
  };

  const style = getColorStyles(message.senderColor);

  return (
    <div
      id={`message-${message.id}`}
      className={`group relative flex gap-3 p-4 rounded border ${style.bg} ${style.border} transition-all duration-200`}
    >
      {/* Accent marker */}
      <div className={`absolute top-0 bottom-0 left-0 w-1 rounded-l ${style.accent}`} />

      {/* Avatar icon */}
      <div className="flex-none">
        <div className="w-10 h-10 rounded bg-[#0c0c0e] border border-[#27272a] flex items-center justify-center text-xl select-none">
          {message.senderEmoji}
        </div>
      </div>

      {/* Bubble Content */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-2 font-mono">
          <span className="font-sans font-semibold text-zinc-100 text-xs">
            {message.senderName}
          </span>
          <span className={`text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#0c0c0e] border ${style.text}`}>
            {message.senderRole}
          </span>
          <span className="text-[9px] text-zinc-500 ml-auto">
            {message.timestamp}
          </span>
        </div>

        {/* Markdown content with prose-invert formatting */}
        <div className="markdown-body font-sans text-xs text-zinc-200 leading-relaxed space-y-1.5 prose prose-sm prose-invert max-w-none">
          <Markdown>{message.content}</Markdown>
        </div>
      </div>

      {/* Micro copy button */}
      <button
        id={`btn-copy-${message.id}`}
        onClick={handleCopy}
        className="absolute top-2.5 right-2.5 p-1 rounded border border-[#27272a] bg-[#0c0c0e] text-zinc-500 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:text-zinc-200 hover:border-zinc-500 cursor-pointer"
        title="Copy response"
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald-400 animate-pulse" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>
    </div>
  );
}
