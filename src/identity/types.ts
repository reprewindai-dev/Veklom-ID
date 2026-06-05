export interface AgentCard {
  id: string; // uuid
  owner_user_id: string;
  workspace_id: string;
  wallet_address: string | null;
  agent_id: string | null;
  display_name: string;
  trust_score: number; // default: 100
  operator_rank: string; // default: "Recruit"
  current_streak: number; // default: 0
  longest_streak: number; // default: 0
  completed_missions: number; // default: 0
  verified_actions: number; // default: 0
  successful_agent_runs: number; // default: 0
  policy_violations: number; // default: 0
  governance_proofs_generated: number; // default: 0
  last_score_event_at: string | null; // ISO string or null
  last_attestation_tx: string | null;
  score_version: number; // default: 1
  created_at: string;
  updated_at: string;
}

export interface TrustScoreEvent {
  id: string; // uuid
  agent_card_id: string;
  event_type: string;
  points_delta: number;
  reason: string;
  evidence_hash: string | null; // hex string
  policy_id: string | null;
  mission_id: string | null;
  run_id: string | null;
  tx_hash: string | null;
  created_at: string;
}

export type RankTier = 
  | "Unranked"
  | "Recruit"
  | "Operator"
  | "Trusted Operator"
  | "Sovereign"
  | "Elite Sovereign"
  | "Apex";

export interface ScoreBreakdownItem {
  id: string;
  event_type: string;
  points_delta: number;
  reason: string;
  created_at: string;
}

export interface TrustBreakdown {
  starting_score: number;
  applied_events: ScoreBreakdownItem[];
  total_delta: number;
  final_score: number;
  final_rank: string;
}
