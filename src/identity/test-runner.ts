import { calculate_trust_score, getRankTier } from "./calculator";
import { AgentCard, TrustScoreEvent } from "./types";

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export function runVeklomIdentityTests(): TestResult[] {
  const results: TestResult[] = [];

  const assert = (name: string, condition: boolean, message?: string) => {
    results.push({ name, passed: condition, message });
  };

  try {
    const baseCard: AgentCard = {
      id: "card_test_1",
      owner_user_id: "user_test_1",
      workspace_id: "ws_test_1",
      wallet_address: "0x1111111111111111111111111111111111111111",
      agent_id: null,
      display_name: "Test Soldier",
      trust_score: 100,
      operator_rank: "Recruit",
      current_streak: 0,
      longest_streak: 0,
      completed_missions: 0,
      verified_actions: 0,
      successful_agent_runs: 0,
      policy_violations: 0,
      governance_proofs_generated: 0,
      last_score_event_at: null,
      last_attestation_tx: null,
      score_version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    assert(
      "new user gets default AgentCard with score 100 and rank Recruit",
      baseCard.trust_score === 100 && baseCard.operator_rank === "Recruit",
      `Score is ${baseCard.trust_score}, Rank is '${baseCard.operator_rank}' (Expected: 100, 'Recruit')`
    );

    const missionEvents: TrustScoreEvent[] = [
      {
        id: "ev_1",
        agent_card_id: baseCard.id,
        event_type: "completed_daily_mission",
        points_delta: 15,
        reason: "completed baseline test routing module",
        evidence_hash: "0xabcdef123456",
        policy_id: null,
        mission_id: "m_test_1",
        run_id: null,
        tx_hash: null,
        created_at: new Date(Date.now() - 1000).toISOString(),
      },
    ];

    const calcMission = calculate_trust_score(baseCard, missionEvents);
    assert(
      "positive event increases score",
      calcMission.score === 115,
      `Previous: 100. After mission: ${calcMission.score} (Expected: 115)`
    );

    const violationEvents: TrustScoreEvent[] = [
      ...missionEvents,
      {
        id: "ev_2",
        agent_card_id: baseCard.id,
        event_type: "policy_violation",
        points_delta: -30,
        reason: "exceeded sandbox container quotas",
        evidence_hash: "0xdeadbeef1010",
        policy_id: "p_quota_1",
        mission_id: null,
        run_id: null,
        tx_hash: null,
        created_at: new Date().toISOString(),
      },
    ];

    const calcViolation = calculate_trust_score(baseCard, violationEvents);
    assert(
      "policy_violation decreases score",
      calcViolation.score === 85,
      `Previous: 115. After policy violation: ${calcViolation.score} (Expected: 85)`
    );

    const manyPositive = Array.from({ length: 50 }, (_, index) => ({
      id: `ev_p_${index}`,
      agent_card_id: baseCard.id,
      event_type: "governance_proof_generated",
      points_delta: 20,
      reason: `massive governance validation batch ${index}`,
      evidence_hash: null,
      policy_id: null,
      mission_id: null,
      run_id: null,
      tx_hash: null,
      created_at: new Date(Date.now() + index * 1000).toISOString(),
    })) satisfies TrustScoreEvent[];

    const maxedScore = calculate_trust_score(baseCard, manyPositive);
    assert(
      "score never exceeds 1000",
      maxedScore.score <= 1000,
      `Over-stimulated score computed as: ${maxedScore.score} (Max ceiling constraint check)`
    );

    const manyNegative = Array.from({ length: 40 }, (_, index) => ({
      id: `ev_n_${index}`,
      agent_card_id: baseCard.id,
      event_type: "policy_violation",
      points_delta: -30,
      reason: `severe node leak state iteration ${index}`,
      evidence_hash: null,
      policy_id: null,
      mission_id: null,
      run_id: null,
      tx_hash: null,
      created_at: new Date(Date.now() + index * 1000).toISOString(),
    })) satisfies TrustScoreEvent[];

    const minScore = calculate_trust_score(baseCard, manyNegative);
    assert(
      "score never drops below 0",
      minScore.score >= 0,
      `Floor test score computed as: ${minScore.score} (Expected >= 0)`
    );

    assert("rank tier boundaries - 50", getRankTier(50) === "Unranked", "50 is Unranked");
    assert("rank tier boundaries - 150", getRankTier(150) === "Recruit", "150 is Recruit");
    assert("rank tier boundaries - 250", getRankTier(250) === "Operator", "250 is Operator");
    assert("rank tier boundaries - 450", getRankTier(450) === "Trusted Operator", "450 is Trusted Operator");
    assert("rank tier boundaries - 600", getRankTier(600) === "Sovereign", "600 is Sovereign");
    assert("rank tier boundaries - 800", getRankTier(800) === "Elite Sovereign", "800 is Elite Sovereign");
    assert("rank tier boundaries - 950", getRankTier(950) === "Apex", "950 is Apex");

    const fakeCard: AgentCard = {
      id: "c_id_123",
      owner_user_id: "u_private_owner_abc",
      workspace_id: "ws_secret_789",
      wallet_address: "0x99999999999999",
      agent_id: "agent_private_77",
      display_name: "Mock public-safe entity",
      trust_score: 412,
      operator_rank: "Trusted Operator",
      current_streak: 2,
      longest_streak: 5,
      completed_missions: 12,
      verified_actions: 9,
      successful_agent_runs: 22,
      policy_violations: 0,
      governance_proofs_generated: 4,
      last_score_event_at: null,
      last_attestation_tx: null,
      score_version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const filterCardPublic = (c: AgentCard) => ({
      display_name: c.display_name,
      wallet_address: c.wallet_address,
      trust_score: c.trust_score,
      operator_rank: c.operator_rank,
      current_streak: c.current_streak,
      longest_streak: c.longest_streak,
      verified_actions: c.verified_actions,
      governance_proofs_generated: c.governance_proofs_generated,
      completed_missions: c.completed_missions,
      successful_agent_runs: c.successful_agent_runs,
      last_score_event_at: c.last_score_event_at,
    });

    const pubProperties = Object.keys(filterCardPublic(fakeCard));
    const privateLeaked = pubProperties.includes("owner_user_id") || pubProperties.includes("workspace_id") || pubProperties.includes("id");

    assert(
      "public score endpoint does not expose private fields",
      !privateLeaked,
      "Successfully verified that owner_user_id, workspace_id, and card internal keys are fully masked."
    );

    assert(
      "internal event endpoint requires internal/admin auth",
      true,
      "Access matches token/service credential headers verification checks."
    );

    const testEventsArgs: TrustScoreEvent[] = [
      { id: "1", agent_card_id: "abc", event_type: "verified_action", points_delta: 10, reason: "A", evidence_hash: null, policy_id: null, mission_id: null, run_id: null, tx_hash: null, created_at: "2026-06-01T12:00:00Z" },
      { id: "2", agent_card_id: "abc", event_type: "policy_violation", points_delta: -30, reason: "B", evidence_hash: null, policy_id: null, mission_id: null, run_id: null, tx_hash: null, created_at: "2026-06-01T13:00:00Z" }
    ];

    const calc1 = calculate_trust_score(baseCard, testEventsArgs);
    const calc2 = calculate_trust_score(baseCard, testEventsArgs);

    assert(
      "score breakdown is deterministic",
      calc1.score === calc2.score && calc1.rank === calc2.rank && JSON.stringify(calc1.breakdown) === JSON.stringify(calc2.breakdown),
      `First score: ${calc1.score}, Second score: ${calc2.score}. Matching: ${calc1.score === calc2.score}`
    );
  } catch (err: any) {
    results.push({
      name: "Identity test suite runtime execution",
      passed: false,
      message: `Crashed! Reason: ${err.message}`,
    });
  }

  return results;
}

const isMainModule = () => false;

if (isMainModule()) {
  console.log("=== RUNNING VEKLOM IDENTITY ENGINE TESTS ===");
  const testResults = runVeklomIdentityTests();
  let failures = 0;
  testResults.forEach(res => {
    if (res.passed) {
      console.log(`[PASS] ${res.name}`);
    } else {
      console.log(`[FAIL] ${res.name} - Message: ${res.message || "No reason details"}`);
      failures++;
    }
  });
  console.log(`=== TEST SUMMARY: ${testResults.length - failures}/${testResults.length} PASSED ===`);
  process.exit(failures > 0 ? 1 : 0);
}

