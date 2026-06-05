export interface Agent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  temperature: number;
  emoji: string;
  color: string; // Tailwind color class, e.g. "emerald", "amber", "indigo", etc.
  isEnabled: boolean;
}

export interface Message {
  id: string;
  timestamp: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderEmoji: string;
  senderColor: string;
  content: string;
}

export type SimulationMode = "group_chat" | "debate" | "pipeline";

export type SimulationState = "idle" | "running" | "paused" | "finished";

export interface TaskPreset {
  id: string;
  title: string;
  description: string;
  mode: SimulationMode;
  agents: Agent[];
}
