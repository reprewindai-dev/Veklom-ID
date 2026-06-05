import { Router, Request, Response } from "express";
import { identityDb } from "./db";
import { EVENT_POINTS_MAP } from "./calculator";
import { runVeklomIdentityTests } from "./test-runner";

const router = Router();

// Constant service access tokens for internal API authentication
const DEFAULT_SERVICE_TOKEN = "veklom_secure_service_token_2026";
const INTERNAL_SERVICE_TOKEN = process.env.VEKLOM_INTERNAL_TOKEN || DEFAULT_SERVICE_TOKEN;

/**
 * Helper to extract user identity from headers.
 * Supports Authorization Bearer <user_id> or X-User-Id header.
 * Falls back to a deterministic sandbox default user.
 */
function getAuthUserId(req: Request): string {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }
  
  const xUserId = req.headers["x-user-id"];
  if (xUserId && typeof xUserId === "string" && xUserId.trim() !== "") {
    return xUserId.trim();
  }

  // Fallback default mock user in development
  return "user_default_veklom_operator_node";
}

/**
 * GET /api/v1/identity/me
 * Authenticated user gets their canonical Identity card
 */
router.get("/me", (req: Request, res: Response) => {
  try {
    const ownerUserId = getAuthUserId(req);
    
    let card = identityDb.findCardByUserId(ownerUserId);
    if (!card) {
      // Auto-create default card
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

    // Explicitly mask internal security structures (never return user_id, workspace_id, database references etc.)
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
 * POST /api/v1/internal/identity/events
 * Internal router to log high value network actions (Daily Streak completed, Policy breach, Agent runs etc)
 * Protected with secret Service Authority Token.
 */
router.post("/events", (req: Request, res: Response) => {
  try {
    // Audit core services token header
    const reqToken = req.headers["x-internal-token"] || req.headers["x-service-token"];
    const authHeader = req.headers["authorization"];
    
    let isAuthorized = false;
    if (reqToken === INTERNAL_SERVICE_TOKEN) {
      isAuthorized = true;
    } else if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.substring(7).trim();
      if (token === INTERNAL_SERVICE_TOKEN) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        error: "Forbidden. Access is restricted to trusted internal service controllers.",
      });
    }

    const {
      agent_card_id,
      wallet_address,
      event_type,
      points_delta,
      reason,
      evidence_hash,
      policy_id,
      mission_id,
      run_id,
      tx_hash,
      created_at,
    } = req.body;

    if (!event_type) {
      return res.status(400).json({ error: "Missing parameter: event_type." });
    }
    if (!reason) {
      return res.status(400).json({ error: "Missing parameter: reason." });
    }

    // Resolve which Sovereign Agent Card to apply event to
    let cardId = agent_card_id;
    if (!cardId && wallet_address) {
      const card = identityDb.findCardByAddress(wallet_address);
      if (!card) {
        return res.status(404).json({
          error: `Could not log event: No AgentCard found for wallet address '${wallet_address}'`,
        });
      }
      cardId = card.id;
    }

    if (!cardId) {
      return res.status(400).json({
        error: "Missing database reference: Must provide either 'agent_card_id' or 'wallet_address'.",
      });
    }

    const card = identityDb.findCardById(cardId);
    if (!card) {
      return res.status(404).json({ error: `AgentCard with ID '${cardId}' was not found in database.` });
    }

    // Use default points if not explicitly specified
    let delta = points_delta;
    if (delta === undefined || delta === null) {
      delta = EVENT_POINTS_MAP[event_type];
      if (delta === undefined) {
        return res.status(400).json({
          error: `Unknown event_type '${event_type}' and no explicit points_delta was provided.`,
        });
      }
    }

    // Record the event and recalculate the card metrics
    const result = identityDb.addEvent({
      agent_card_id: cardId,
      event_type,
      points_delta: delta,
      reason,
      evidence_hash: evidence_hash || null,
      policy_id: policy_id || null,
      mission_id: mission_id || null,
      run_id: run_id || null,
      tx_hash: tx_hash || null,
      created_at,
    });

    return res.status(201).json({
      success: true,
      message: `Event processed successfully for operator '${result.card.display_name}'.`,
      event: result.event,
      card: result.card,
      breakdown: result.breakdown,
    });
  } catch (err: any) {
    console.error("Error in POST /internal/identity/events:", err);
    return res.status(500).json({ error: `Internal error processing identity system event: ${err.message}` });
  }
});


/**
 * POST /api/v1/identity/link-wallet
 * Optional helper route to link a wallet address with the current canonical card.
 */
router.post("/link-wallet", (req: Request, res: Response) => {
  try {
    const ownerUserId = getAuthUserId(req);
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({ error: "Missing parameter: wallet_address." });
    }

    let card = identityDb.findCardByUserId(ownerUserId);
    if (!card) {
      card = identityDb.createDefaultCard(ownerUserId, "Operator Node Alpha");
    }

    const updated = identityDb.linkWalletAddress(card.id, wallet_address);
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
export { DEFAULT_SERVICE_TOKEN };
