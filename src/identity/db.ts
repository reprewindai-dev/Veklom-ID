import fs from "fs";
import path from "path";
import crypto from "crypto";
import { AgentCard, TrustScoreEvent } from "./types";
import { calculate_trust_score, EVENT_POINTS_MAP } from "./calculator";

const DB_FILE_PATH = path.join(process.cwd(), "veklom_id_db.json");

interface DbSchema {
  agentCards: AgentCard[];
  events: TrustScoreEvent[];
}

class IdentityDb {
  private data: DbSchema = {
    agentCards: [],
    events: [],
  };

  constructor() {
    this.load();
  }

  /**
   * Loads DB from local JSON file. Auto-seeds with sample data if empty.
   */
  private load() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, "utf-8");
        this.data = JSON.parse(fileContent);
        // Guarantee arrays exist
        if (!this.data.agentCards) this.data.agentCards = [];
        if (!this.data.events) this.data.events = [];
      } else {
        this.save(); // write default empty schema to file
      }
    } catch (err) {
      console.error("Error reading Veklom Identity DB file. Initializing empty collection.", err);
      this.data = { agentCards: [], events: [] };
    }
  }

  /**
   * Persists DB changes to disk.
   */
  private save() {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      console.error("Error writing Veklom Identity DB file:", err);
    }
  }

  public getAgentCards(): AgentCard[] {
    return this.data.agentCards;
  }

  public getEvents(): TrustScoreEvent[] {
    return this.data.events;
  }

  public findCardByUserId(ownerUserId: string): AgentCard | null {
    return this.data.agentCards.find(c => c.owner_user_id === ownerUserId) || null;
  }

  public findCardByAddress(address: string): AgentCard | null {
    if (!address) return null;
    const lower = address.toLowerCase();
    return this.data.agentCards.find(c => c.wallet_address?.toLowerCase() === lower) || null;
  }

  public findCardById(cardId: string): AgentCard | null {
    return this.data.agentCards.find(c => c.id === cardId) || null;
  }

  /**
   * Creates a default AgentCard for the user if missing.
   */
  public createDefaultCard(ownerUserId: string, displayName = "Operator Node"): AgentCard {
    const existing = this.findCardByUserId(ownerUserId);
    if (existing) return existing;

    const nowStr = new Date().toISOString();
    const newCard: AgentCard = {
      id: crypto.randomUUID(),
      owner_user_id: ownerUserId,
      workspace_id: `ws_${crypto.randomBytes(6).toString("hex")}`,
      wallet_address: null,
      agent_id: null,
      display_name: displayName,
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
      created_at: nowStr,
      updated_at: nowStr,
    };

    this.data.agentCards.push(newCard);
    this.save();
    return newCard;
  }

  /**
   * Links a wallet address to an AgentCard.
   */
  public linkWalletAddress(cardId: string, address: string): AgentCard | null {
    const card = this.findCardById(cardId);
    if (!card) return null;

    card.wallet_address = address;
    card.updated_at = new Date().toISOString();
    this.save();
    return card;
  }

  /**
   * Appends an event, re-computes scores & counters chronologically, and persists changes.
   */
  public addEvent(eventData: Omit<TrustScoreEvent, "id" | "created_at" | "points_delta"> & { points_delta?: number; created_at?: string }): {
    event: TrustScoreEvent;
    card: AgentCard;
    breakdown: any;
  } {
    const card = this.findCardById(eventData.agent_card_id);
    if (!card) {
      throw new Error(`AgentCard with ID ${eventData.agent_card_id} not found.`);
    }

    const nowStr = new Date().toISOString();
    
    // Resolve points_delta dynamically if not specified
    let delta = eventData.points_delta;
    if (delta === undefined || delta === null) {
      delta = EVENT_POINTS_MAP[eventData.event_type] || 0;
    }

    const newEvent: TrustScoreEvent = {
      ...eventData,
      points_delta: delta,
      id: crypto.randomUUID(),
      created_at: eventData.created_at || nowStr,
    };

    // Store event
    this.data.events.push(newEvent);

    // Re-verify the updated scores and counters from history
    const response = this.recalculateCard(card.id);
    return {
      event: newEvent,
      card: response.card,
      breakdown: response.breakdown,
    };
  }

  /**
   * Reproduces standard scoring state and aggregates stats/counters from event history.
   * This guarantees total determinism and satisfy the constraint "Score must be reproducible from history".
   */
  public recalculateCard(cardId: string): { card: AgentCard; breakdown: any } {
    const card = this.findCardById(cardId);
    if (!card) throw new Error(`AgentCard ${cardId} not found`);

    // Fetch this card's events
    const cardEvents = this.data.events.filter(e => e.agent_card_id === cardId);

    // Calculate score, rank and breakdown purely using the pure calculate_trust_score function
    const calculation = calculate_trust_score(card, cardEvents);

    // Re-aggregate specific event counters sequentially
    let completed_missions = 0;
    let verified_actions = 0;
    let successful_agent_runs = 0;
    let policy_violations = 0;
    let governance_proofs_generated = 0;
    let current_streak = 0;
    let longest_streak = 0;

    // Chronological processing of counters
    const sortedEvents = [...cardEvents].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const ev of sortedEvents) {
      const type = ev.event_type;
      if (type === "completed_daily_mission") {
        completed_missions++;
      } else if (type === "verified_action") {
        verified_actions++;
      } else if (type === "successful_agent_run") {
        successful_agent_runs++;
      } else if (type === "policy_violation") {
        policy_violations++;
      } else if (type === "governance_proof_generated") {
        governance_proofs_generated++;
      } else if (type === "streak_day_completed") {
        current_streak++;
        if (current_streak > longest_streak) {
          longest_streak = current_streak;
        }
      }
      // TODO: Implement sophisticated sliding streak window calculation when needed in v2.
      // Currently runs on sequential manual streak event ingestion as requested by the spec.
    }

    // Update Card mutable metadata fields
    card.trust_score = calculation.score;
    card.operator_rank = calculation.rank;
    card.completed_missions = completed_missions;
    card.verified_actions = verified_actions;
    card.successful_agent_runs = successful_agent_runs;
    card.policy_violations = policy_violations;
    card.governance_proofs_generated = governance_proofs_generated;
    card.current_streak = current_streak;
    card.longest_streak = longest_streak;

    if (sortedEvents.length > 0) {
      card.last_score_event_at = sortedEvents[sortedEvents.length - 1].created_at;
    }

    card.updated_at = new Date().toISOString();

    this.save();

    return {
      card,
      breakdown: calculation.breakdown,
    };
  }
}

// Singleton database instance
export const identityDb = new IdentityDb();
