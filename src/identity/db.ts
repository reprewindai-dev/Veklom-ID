import fs from "fs";
import path from "path";
import crypto from "crypto";
import { AgentCard, TrustScoreEvent } from "./types";
import { calculate_trust_score, EVENT_POINTS_MAP } from "./calculator";

const DB_FILE_PATH = process.env.VEKLOM_ID_DB_PATH
  ? path.resolve(process.env.VEKLOM_ID_DB_PATH)
  : path.join(process.cwd(), "data", "veklom_id_db.json");

interface DbSchema {
  agentCards: AgentCard[];
  events: TrustScoreEvent[];
}

class IdentityDb {
  private data: DbSchema = { agentCards: [], events: [] };

  constructor() {
    this.load();
  }

  private load() {
    try {
      fs.mkdirSync(path.dirname(DB_FILE_PATH), { recursive: true });
      if (fs.existsSync(DB_FILE_PATH)) {
        const parsed = JSON.parse(fs.readFileSync(DB_FILE_PATH, "utf-8")) as Partial<DbSchema>;
        this.data = {
          agentCards: Array.isArray(parsed.agentCards) ? parsed.agentCards : [],
          events: Array.isArray(parsed.events) ? parsed.events : [],
        };
      } else {
        this.save();
      }
    } catch (err) {
      console.error("Error reading Veklom Identity DB file. Initializing empty collection.", err);
      this.data = { agentCards: [], events: [] };
    }
  }

  private save() {
    fs.mkdirSync(path.dirname(DB_FILE_PATH), { recursive: true });
    const tmpPath = `${DB_FILE_PATH}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), "utf-8");
    fs.renameSync(tmpPath, DB_FILE_PATH);
  }

  public getAgentCards(): AgentCard[] { return this.data.agentCards; }
  public getEvents(): TrustScoreEvent[] { return this.data.events; }

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
      trust_score: 0,
      operator_rank: "Unverified",
      current_streak: 0,
      longest_streak: 0,
      completed_missions: 0,
      verified_actions: 0,
      successful_agent_runs: 0,
      policy_violations: 0,
      governance_proofs_generated: 0,
      last_score_event_at: null,
      last_attestation_tx: null,
      score_version: 2,
      created_at: nowStr,
      updated_at: nowStr,
    };

    this.data.agentCards.push(newCard);
    this.save();
    return newCard;
  }

  public linkWalletAddress(cardId: string, address: string): AgentCard | null {
    const card = this.findCardById(cardId);
    if (!card) return null;
    card.wallet_address = address;
    card.updated_at = new Date().toISOString();
    this.save();
    return card;
  }

  public updateCardProfile(cardId: string, updates: { display_name?: string; wallet_address?: string | null }): AgentCard | null {
    const card = this.findCardById(cardId);
    if (!card) return null;
    if (typeof updates.display_name === "string") card.display_name = updates.display_name;
    if (updates.wallet_address !== undefined) card.wallet_address = updates.wallet_address;
    card.updated_at = new Date().toISOString();
    this.save();
    return card;
  }

  public addEvent(eventData: Omit<TrustScoreEvent, "id" | "created_at" | "points_delta"> & { points_delta?: number; created_at?: string }): {
    event: TrustScoreEvent;
    card: AgentCard;
    breakdown: ReturnType<typeof calculate_trust_score>["breakdown"];
  } {
    const card = this.findCardById(eventData.agent_card_id);
    if (!card) throw new Error(`AgentCard with ID ${eventData.agent_card_id} not found.`);

    const nowStr = new Date().toISOString();
    let delta = eventData.points_delta;
    if (delta === undefined || delta === null) delta = EVENT_POINTS_MAP[eventData.event_type] || 0;

    const newEvent: TrustScoreEvent = {
      ...eventData,
      points_delta: delta,
      id: crypto.randomUUID(),
      created_at: eventData.created_at || nowStr,
    };

    this.data.events.push(newEvent);
    const response = this.recalculateCard(card.id);
    return { event: newEvent, card: response.card, breakdown: response.breakdown };
  }

  public recalculateCard(cardId: string): { card: AgentCard; breakdown: ReturnType<typeof calculate_trust_score>["breakdown"] } {
    const card = this.findCardById(cardId);
    if (!card) throw new Error(`AgentCard ${cardId} not found`);

    const cardEvents = this.data.events.filter(e => e.agent_card_id === cardId);
    const calculation = calculate_trust_score(card, cardEvents);

    let completed_missions = 0;
    let verified_actions = 0;
    let successful_agent_runs = 0;
    let policy_violations = 0;
    let governance_proofs_generated = 0;
    let current_streak = 0;
    let longest_streak = 0;

    const sortedEvents = [...cardEvents].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    for (const ev of sortedEvents) {
      const type = ev.event_type;
      if (type === "completed_daily_mission") completed_missions++;
      else if (type === "verified_action") verified_actions++;
      else if (type === "successful_agent_run") successful_agent_runs++;
      else if (type === "policy_violation") policy_violations++;
      else if (type === "governance_proof_generated") governance_proofs_generated++;
      else if (type === "streak_day_completed") {
        current_streak++;
        if (current_streak > longest_streak) longest_streak = current_streak;
      }
    }

    card.trust_score = calculation.score;
    card.operator_rank = calculation.rank;
    card.completed_missions = completed_missions;
    card.verified_actions = verified_actions;
    card.successful_agent_runs = successful_agent_runs;
    card.policy_violations = policy_violations;
    card.governance_proofs_generated = governance_proofs_generated;
    card.current_streak = current_streak;
    card.longest_streak = longest_streak;
    card.last_score_event_at = sortedEvents.length > 0 ? sortedEvents[sortedEvents.length - 1].created_at : null;
    card.score_version = 2;
    card.updated_at = new Date().toISOString();
    this.save();

    return { card, breakdown: calculation.breakdown };
  }
}

export const identityDb = new IdentityDb();
