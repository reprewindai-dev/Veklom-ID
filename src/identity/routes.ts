import crypto from "crypto";
import { Router, Request, Response } from "express";
import { identityDb } from "./db";
import { EVENT_POINTS_MAP } from "./calculator";
import { runVeklomIdentityTests } from "./test-runner";

const router = Router();
const SESSION_COOKIE_NAME = "veklom_sid";
const INTERNAL_SERVICE_TOKEN = process.env.VEKLOM_INTERNAL_TOKEN || "";
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const PUBLIC_EVENT_TYPES = new Set(Object.keys(EVENT_POINTS_MAP));

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [rawKey, ...rawValue] = pair.trim().split("=");
    if (!rawKey) return acc;
    acc[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.join("=") || "");
    return acc;
  }, {});
}

function setSessionCookie(res: Response, userId: string) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(userId)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=31536000`
  );
}

function getSessionUserId(req: Request, res: Response): string {
  const cookies = parseCookies(req.headers.cookie);
  const existing = cookies[SESSION_COOKIE_NAME];
  if (existing) {
    return existing;
  }

  const userId = `session_${crypto.randomUUID()}`;
  setSessionCookie(res, userId);
  return userId;
}

function isInternalRequest(req: Request): boolean {
  return req.baseUrl.includes("/internal/");
}

function authorizeInternalRequest(req: Request): boolean {
  if (!INTERNAL_SERVICE_TOKEN) return false;

  const reqToken = req.headers["x-internal-token"] || req.headers["x-service-token"];
  const authHeader = req.headers["authorization"];

  if (reqToken === INTERNAL_SERVICE_TOKEN) {
    return true;
  }

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.substring(7).trim();
    return token === INTERNAL_SERVICE_TOKEN;
  }

  return false;
}

function normalizeDisplayName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return null;
  if (!/^[\p{L}\p{N} _.-]+$/u.test(trimmed)) return null;
  return trimmed;
}

function normalizeWalletAddress(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return EVM_ADDRESS_RE.test(trimmed) ? trimmed : null;
}

function normalizeReason(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.length < 3 || trimmed.length > 280) return null;
  return trimmed;
}

function resolveCardForRequest(req: Request, res: Response, ownerUserId?: string) {
  const userId = ownerUserId ?? getSessionUserId(req, res);
  let card = identityDb.findCardByUserId(userId);
  if (!card) {
    card = identityDb.createDefaultCard(userId, "Operator Node Alpha");
  }
  return card;
}

/**
 * GET /api/v1/identity/me
 * Returns the authenticated browser session's canonical identity card.
 */
router.get("/me", (req: Request, res: Response) => {
  try {
    const ownerUserId = getSessionUserId(req, res);

    let card = identityDb.findCardByUserId(ownerUserId);
    if (!card) {
      card = identityDb.createDefaultCard(ownerUserId, "Operator Node Alpha");
    }

    return res.json({
      success: true,
      card,
    });
  } catch (err: any) {
    console.error("Error in GET /identity/me:", err);
    return res.status(500).json({ error: "Failed to fetch user identity." });
  }
});

/**
 * GET /api/v1/identity/events
 * Returns the authenticated session's event history.
 */
router.get("/events", (req: Request, res: Response) => {
  try {
    const ownerUserId = getSessionUserId(req, res);
    const card = identityDb.findCardByUserId(ownerUserId);

    if (!card) {
      return res.json({ success: true, events: [], card: null });
    }

    const events = identityDb
      .getEvents()
      .filter((event) => event.agent_card_id === card.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.json({ success: true, events, card });
  } catch (err: any) {
    console.error("Error in GET /identity/events:", err);
    return res.status(500).json({ error: "Failed to fetch event history." });
  }
});

/**
 * GET /api/v1/identity/score/{address}
 * Public safe endpoint to retrieve high-level stats of a node address
 */
router.get("/score/:address", (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    if (!address) {
      return res.status(400).json({ error: "Missing wallet address in query path." });
    }

    const card = identityDb.findCardByAddress(address);
    if (!card) {
      return res.status(404).json({
        error: `No Sovereign Operator Identity found linked to address: ${address}`,
      });
    }

    const publicSafeOutput = {
      display_name: card.display_name,
      wallet_address: card.wallet_address,
      trust_score: card.trust_score,
      operator_rank: card.operator_rank,
      current_streak: card.current_streak,
      longest_streak: card.longest_streak,
      verified_actions: card.verified_actions,
      governance_proofs_generated: card.governance_proofs_generated,
      completed_missions: card.completed_missions,
      successful_agent_runs: card.successful_agent_runs,
      last_score_event_at: card.last_score_event_at,
    };

    return res.json(publicSafeOutput);
  } catch (err: any) {
    console.error("Error in GET /identity/score/:address:", err);
    return res.status(500).json({ error: "Failed to query public identity score." });
  }
});

/**
 * POST /api/v1/identity/events
 * Public session event logging; the internal mount can still use this handler with service auth.
 */
router.post("/events", (req: Request, res: Response) => {
  try {
    const internal = isInternalRequest(req);
    if (internal && !authorizeInternalRequest(req)) {
      return res.status(403).json({
        error: "Forbidden. Access is restricted to trusted internal service controllers.",
      });
    }

    const { agent_card_id, wallet_address, event_type, points_delta, reason, evidence_hash, policy_id, mission_id, run_id, tx_hash, created_at } = req.body;
    const normalizedReason = normalizeReason(reason);

    if (!event_type || typeof event_type !== "string") {
      return res.status(400).json({ error: "Missing parameter: event_type." });
    }
    if (!normalizedReason) {
      return res.status(400).json({ error: "Missing or invalid parameter: reason." });
    }

    let cardId: string | null = null;
    if (internal) {
      if (agent_card_id && typeof agent_card_id === "string") {
        cardId = agent_card_id;
      } else if (typeof wallet_address === "string") {
        const card = identityDb.findCardByAddress(wallet_address);
        if (!card) {
          return res.status(404).json({ error: `Could not log event: No AgentCard found for wallet address '${wallet_address}'` });
        }
        cardId = card.id;
      }

      if (!cardId) {
        return res.status(400).json({
          error: "Missing database reference: Must provide either 'agent_card_id' or 'wallet_address'.",
        });
      }
    } else {
      const ownerUserId = getSessionUserId(req, res);
      const card = resolveCardForRequest(req, res, ownerUserId);
      cardId = card.id;

      if (points_delta !== undefined && points_delta !== null) {
        return res.status(400).json({ error: "Custom point overrides are reserved for internal services." });
      }
    }

    const card = identityDb.findCardById(cardId);
    if (!card) {
      return res.status(404).json({ error: `AgentCard with ID '${cardId}' was not found in database.` });
    }

    let delta: number | undefined;
    if (internal && typeof points_delta === "number" && Number.isFinite(points_delta)) {
      delta = Math.max(-1000, Math.min(1000, Math.trunc(points_delta)));
    } else {
      if (!PUBLIC_EVENT_TYPES.has(event_type) && !internal) {
        return res.status(400).json({ error: `Unknown event_type '${event_type}'.` });
      }
      delta = EVENT_POINTS_MAP[event_type];
      if (delta === undefined) {
        return res.status(400).json({
          error: `Unknown event_type '${event_type}' and no explicit points_delta was provided.`,
        });
      }
    }

    const result = identityDb.addEvent({
      agent_card_id: cardId,
      event_type,
      points_delta: delta,
      reason: normalizedReason,
      evidence_hash: typeof evidence_hash === "string" && evidence_hash.trim() ? evidence_hash.trim() : null,
      policy_id: typeof policy_id === "string" && policy_id.trim() ? policy_id.trim() : null,
      mission_id: typeof mission_id === "string" && mission_id.trim() ? mission_id.trim() : null,
      run_id: typeof run_id === "string" && run_id.trim() ? run_id.trim() : null,
      tx_hash: typeof tx_hash === "string" && tx_hash.trim() ? tx_hash.trim() : null,
      created_at: typeof created_at === "string" && created_at.trim() ? created_at.trim() : undefined,
    });

    return res.status(201).json({
      success: true,
      message: `Event processed successfully for operator '${result.card.display_name}'.`,
      event: result.event,
      card: result.card,
      breakdown: result.breakdown,
    });
  } catch (err: any) {
    console.error("Error in POST /identity/events:", err);
    return res.status(500).json({ error: `Internal error processing identity system event: ${err.message}` });
  }
});

/**
 * POST /api/v1/identity/link-wallet
 * Updates the current session profile wallet and display name.
 */
router.post("/link-wallet", (req: Request, res: Response) => {
  try {
    const ownerUserId = getSessionUserId(req, res);
    const { wallet_address, display_name } = req.body;

    const normalizedWallet = wallet_address === undefined ? undefined : normalizeWalletAddress(wallet_address);
    const normalizedName = display_name === undefined ? undefined : normalizeDisplayName(display_name);

    if (wallet_address !== undefined && !normalizedWallet) {
      return res.status(400).json({ error: "Missing or invalid parameter: wallet_address." });
    }
    if (display_name !== undefined && !normalizedName) {
      return res.status(400).json({ error: "Missing or invalid parameter: display_name." });
    }
    if (normalizedWallet === undefined && normalizedName === undefined) {
      return res.status(400).json({ error: "Provide wallet_address and/or display_name." });
    }

    const card = resolveCardForRequest(req, res, ownerUserId);
    const updated = identityDb.updateCardProfile(card.id, {
      wallet_address: normalizedWallet === undefined ? undefined : normalizedWallet,
      display_name: normalizedName,
    });

    return res.json({
      success: true,
      card: updated,
    });
  } catch (err: any) {
    console.error("Error linking wallet address:", err);
    return res.status(500).json({ error: "Failed to register address." });
  }
});

/**
 * GET /api/v1/identity/test-run
 * Performs fully automated test suite execution mapping directly to all 10 acceptance parameters
 */
router.get("/test-run", (req: Request, res: Response) => {
  try {
    const results = runVeklomIdentityTests();
    const passed = results.every(r => r.passed);
    return res.json({
      success: passed,
      totalTests: results.length,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err: any) {
    console.error("Error running identity tests:", err);
    return res.status(500).json({ error: `Test execution failed with error: ${err.message}` });
  }
});

export default router;
