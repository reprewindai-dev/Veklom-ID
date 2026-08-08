import { AgentCard, TrustScoreEvent, TrustBreakdown, ScoreBreakdownItem } from "./types";

export const EVENT_POINTS_MAP: Record<string, number> = {
  completed_daily_mission: 15,
  verified_action: 10,
  successful_agent_run: 10,
  governance_proof_generated: 20,
  streak_day_completed: 5,
  seven_day_streak_bonus: 35,
  x402_payment_verified: 10,
  policy_violation: -30,
  failed_agent_run: -10,
  replay_blocked: -20,
  budget_exceeded: -25,
};

export function getRankTier(score: number): string {
  if (score < 100) return "Unverified";
  if (score < 200) return "Recruit";
  if (score < 350) return "Operator";
  if (score < 500) return "Trusted Operator";
  if (score < 700) return "Sovereign";
  if (score < 850) return "Elite Sovereign";
  return "Apex";
}

/** Trust is earned from recorded events. New identities begin at zero. */
export function calculate_trust_score(
  _agent_card: AgentCard | null,
  events: TrustScoreEvent[]
): { score: number; rank: string; breakdown: TrustBreakdown } {
  const STARTING_SCORE = 0;
  let currentScore = STARTING_SCORE;

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const appliedBreakdownItems: ScoreBreakdownItem[] = [];
  let totalDelta = 0;

  for (const event of sortedEvents) {
    const rawDelta = event.points_delta;
    const initialScore = currentScore;
    let newScore = currentScore + rawDelta;
    if (newScore > 1000) newScore = 1000;
    if (newScore < 0) newScore = 0;

    const actualDeltaApplied = newScore - initialScore;
    currentScore = newScore;
    totalDelta += actualDeltaApplied;

    appliedBreakdownItems.push({
      id: event.id,
      event_type: event.event_type,
      points_delta: rawDelta,
      reason: event.reason,
      created_at: event.created_at,
    });
  }

  const finalRank = getRankTier(currentScore);
  return {
    score: currentScore,
    rank: finalRank,
    breakdown: {
      starting_score: STARTING_SCORE,
      applied_events: appliedBreakdownItems,
      total_delta: totalDelta,
      final_score: currentScore,
      final_rank: finalRank,
    },
  };
}
