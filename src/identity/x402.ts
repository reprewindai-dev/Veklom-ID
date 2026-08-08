import { Router, Request, Response } from "express";
import crypto from "crypto";

const router = Router();
const X402_BASE_URL = (process.env.VEKLOM_X402_BASE_URL || "https://api.veklom.com").replace(/\/$/, "");

async function readJson(response: globalThis.Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function normalizeCapabilityId(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value || !/^[A-Za-z0-9._:-]+$/.test(value)) return null;
  return value;
}

function capabilityRoute(capabilityId: string): string {
  return `/api/v1/agents/skills/${encodeURIComponent(capabilityId)}/invoke`;
}

router.get("/config", async (_req: Request, res: Response) => {
  try {
    const upstream = await fetch(`${X402_BASE_URL}/api/v1/x402/config`, {
      headers: { Accept: "application/json" },
    });
    const body = await readJson(upstream);
    if (!upstream.ok) {
      return res.status(502).json({ error: "canonical_x402_config_unavailable", upstream_status: upstream.status });
    }

    return res.json({
      success: true,
      source: "canonical-veklom-x402",
      ...body,
    });
  } catch (error: any) {
    return res.status(502).json({ error: "canonical_x402_config_unavailable", detail: error?.message });
  }
});

router.post("/challenge", async (req: Request, res: Response) => {
  const capabilityId = normalizeCapabilityId(req.body?.capability_id || req.body?.skill_id);
  if (!capabilityId) {
    return res.status(400).json({ error: "A valid capability_id is required." });
  }

  try {
    const route = capabilityRoute(capabilityId);
    const upstream = await fetch(`${X402_BASE_URL}${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body?.parameters || {}),
    });
    const body = await readJson(upstream);

    if (upstream.status !== 402) {
      return res.status(502).json({
        error: "canonical_endpoint_did_not_issue_payment_challenge",
        upstream_status: upstream.status,
        upstream_body: body,
      });
    }

    return res.status(402).json({
      success: false,
      payment_required: true,
      capability_id: capabilityId,
      route,
      challenge: body,
      payment_required_header: upstream.headers.get("payment-required") || upstream.headers.get("Payment-Required"),
    });
  } catch (error: any) {
    return res.status(502).json({ error: "canonical_payment_challenge_failed", detail: error?.message });
  }
});

router.post("/execute", async (req: Request, res: Response) => {
  const capabilityId = normalizeCapabilityId(req.body?.capability_id || req.body?.skill_id);
  const paymentProof = typeof req.body?.payment_proof === "string" ? req.body.payment_proof.trim() : "";
  if (!capabilityId || !paymentProof) {
    return res.status(400).json({ error: "capability_id and payment_proof are required." });
  }

  const route = capabilityRoute(capabilityId);
  const idempotencyKey =
    typeof req.body?.idempotency_key === "string" && req.body.idempotency_key.trim()
      ? req.body.idempotency_key.trim()
      : crypto.randomUUID();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-PAYMENT": paymentProof,
    "Idempotency-Key": idempotencyKey,
  };
  if (typeof req.body?.challenge_id === "string" && req.body.challenge_id.trim()) {
    headers["X-Payment-Challenge-ID"] = req.body.challenge_id.trim();
  }

  try {
    const upstream = await fetch(`${X402_BASE_URL}${route}`, {
      method: "POST",
      headers,
      body: JSON.stringify(req.body?.parameters || {}),
    });
    const output = await readJson(upstream);

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error: "canonical_paid_execution_failed",
        upstream_status: upstream.status,
        output,
      });
    }

    const receiptId = upstream.headers.get("X-Veklom-Receipt-ID") || "";
    const requestId = upstream.headers.get("X-Veklom-Request-ID") || "";
    const evidenceHash = upstream.headers.get("X-Veklom-Evidence-ID") || "";
    if (!receiptId || !requestId || !evidenceHash) {
      return res.status(502).json({ error: "canonical_execution_missing_evidence_headers" });
    }

    const proofHash = crypto.createHash("sha256").update(paymentProof).digest("hex");
    return res.json({
      success: true,
      capability_id: capabilityId,
      route,
      output,
      receipt_id: receiptId,
      request_id: requestId,
      evidence_hash: evidenceHash,
      proof_hash: proofHash,
      receipt_url: upstream.headers.get("X-Veklom-Receipt-URL"),
      cost_usdc: upstream.headers.get("X-Veklom-Cost-USDC"),
      policy_result: upstream.headers.get("X-Veklom-Policy-Result"),
      payment_verified: upstream.headers.get("X-Payment-Verified"),
      idempotency_key: idempotencyKey,
    });
  } catch (error: any) {
    return res.status(502).json({ error: "canonical_paid_execution_failed", detail: error?.message });
  }
});

router.post("/verify", async (req: Request, res: Response) => {
  const { receipt_id, proof_hash, evidence_hash } = req.body || {};
  if (![receipt_id, proof_hash, evidence_hash].every((value) => typeof value === "string" && value.trim())) {
    return res.status(400).json({ error: "receipt_id, proof_hash, and evidence_hash are required." });
  }

  try {
    const upstream = await fetch(`${X402_BASE_URL}/api/v1/x402/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt_id, proof_hash, evidence_hash }),
    });
    const body = await readJson(upstream);
    return res.status(upstream.status).json(body);
  } catch (error: any) {
    return res.status(502).json({ error: "canonical_evidence_verification_failed", detail: error?.message });
  }
});

// Legacy fabricated backlink/PayPal/premium-content routes were intentionally removed.
// Veklom ID must only award trust from attributable events and canonical evidence.

export default router;
