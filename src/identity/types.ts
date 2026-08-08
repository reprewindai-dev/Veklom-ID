export interface AgentCard {
  id: string;
  owner_user_id: string;
  workspace_id: string;
  wallet_address: string | null;
  agent_id: string | null;
  display_name: string;
  trust_score: number; // starts at 0; earned from recorded events
  operator_rank: string; // starts at "Unverified"
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

export type RankTier =
  | "Unverified"
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
