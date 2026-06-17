import { Router, Request, Response, NextFunction } from "express";
import { identityDb } from "./db";
import crypto from "crypto";
import { createPublicClient, http, isAddress, parseUnits } from "viem";
import { base } from "viem/chains";

const router = Router();

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// Veklom treasury wallet on Base — receives all x402 USDC payments
const MERCHANT_WALLET = "0x3a74772e925b54F7dAD7FD95c9Ba30825033f970";

// USDC contract on Base mainnet
const USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Chain
const CHAIN_ID = "eip155:8453"; // Base mainnet (CAIP-2)

// Payment amounts (in USDC, 6 decimals)
const PRICES: Record<string, string> = {
  "/api/v1/x402/identity/premium": "0.01",   // $0.01 USDC — identity premium lookup
  "/api/v1/x402/benchmark/run": "0.05",       // $0.05 USDC — benchmark run
  "/api/v1/x402/discovery/feature": "0.02",   // $0.02 USDC — discovery feature
};

// Base public RPC client for on-chain verification
const publicClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface PaymentRecord {
  id: string;
  tx_hash: string;
  chain_id: string;
  wallet_address: string;
  amount_usdc: string;
  endpoint: string;
  verified_at: string;
  block_number: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Extracts and normalises the caller wallet address.
 * Priority: X-Wallet-Address header > wallet_address body field
 * Must be a valid EVM address — no fallback to freeform strings.
 */
function getCallerWallet(req: Request): string | null {
  const fromHeader = req.headers["x-wallet-address"] as string;
  if (fromHeader && isAddress(fromHeader)) return fromHeader.toLowerCase();

  const fromBody = req.body?.wallet_address;
  if (fromBody && isAddress(fromBody)) return fromBody.toLowerCase();

  return null;
}

/**
 * Resolves or auto-creates an AgentCard for the given wallet address.
 * The wallet IS the identity — no secondary user ID.
 */
function resolveCardByWallet(walletAddress: string) {
  let card = identityDb.findCardByAddress(walletAddress);
  if (!card) {
    // Create card keyed to wallet address
    card = identityDb.createDefaultCard(walletAddress, `Operator ${walletAddress.slice(0, 8)}`);
    identityDb.linkWalletAddress(card.id, walletAddress);
  }
  return card;
}

/**
 * Builds a valid x402-compliant 402 Payment Required response body and headers.
 * Spec: https://x402.org
 */
function send402(res: Response, endpoint: string) {
  const amount = PRICES[endpoint] || "0.01";

  res.setHeader("X-402-Version", "1");
  res.setHeader("X-402-Chain", CHAIN_ID);
  res.setHeader("X-402-Recipient", MERCHANT_WALLET);
  res.setHeader("X-402-Token", USDC_CONTRACT);
  res.setHeader("X-402-Amount", parseUnits(amount, 6).toString()); // amount in USDC base units
  res.setHeader("X-402-Resource", endpoint);

  return res.status(402).json({
    x402Version: 1,
    error: "Payment Required",
    accepts: [
      {
        scheme: "exact",
        network: CHAIN_ID,
        maxAmountRequired: parseUnits(amount, 6).toString(),
        resource: endpoint,
        description: `Veklom x402 — ${endpoint}`,
        mimeType: "application/json",
        payTo: MERCHANT_WALLET,
        maxTimeoutSeconds: 300,
        asset: USDC_CONTRACT,
        extra: {
          name: "USD Coin",
          version: "2",
        },
      },
    ],
  });
}

/**
 * Verifies a USDC payment transaction on Base mainnet.
 * Checks:
 *   1. Tx exists and is confirmed (not pending)
 *   2. Tx sent USDC to MERCHANT_WALLET
 *   3. Amount >= required for endpoint
 *   4. Tx not already consumed (replay protection)
 */
async function verifyPaymentOnChain(
  txHash: string,
  endpoint: string,
  callerWallet: string
): Promise<{ valid: boolean; error?: string; blockNumber?: string }> {
  try {
    // 1. Fetch the transaction receipt from Base
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt || receipt.status !== "success") {
      return { valid: false, error: "Transaction not found or reverted on Base." };
    }

    // 2. Parse USDC Transfer logs from the receipt
    // ERC-20 Transfer topic: Transfer(address indexed from, address indexed to, uint256 value)
    const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    const usdcLogs = receipt.logs.filter(
      (log) =>
        log.address.toLowerCase() === USDC_CONTRACT.toLowerCase() &&
        log.topics[0] === TRANSFER_TOPIC
    );

    if (usdcLogs.length === 0) {
      return { valid: false, error: "No USDC Transfer event found in transaction." };
    }

    // 3. Find a Transfer to MERCHANT_WALLET from callerWallet with correct amount
    const requiredAmount = parseUnits(PRICES[endpoint] || "0.01", 6);

    const validTransfer = usdcLogs.find((log) => {
      // topics[1] = from (padded), topics[2] = to (padded)
      const to = "0x" + log.topics[2]?.slice(26);
      const from = "0x" + log.topics[1]?.slice(26);
      const value = BigInt(log.data);

      return (
        to.toLowerCase() === MERCHANT_WALLET.toLowerCase() &&
        from.toLowerCase() === callerWallet.toLowerCase() &&
        value >= requiredAmount
      );
    });

    if (!validTransfer) {
      return {
        valid: false,
        error: `No valid USDC transfer of >= ${PRICES[endpoint]} USDC to Veklom wallet found from ${callerWallet}.`,
      };
    }

    return {
      valid: true,
      blockNumber: receipt.blockNumber.toString(),
    };
  } catch (err: any) {
    return { valid: false, error: `RPC verification failed: ${err.message}` };
  }
}

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

/**
 * x402PaymentMiddleware
 * Drop this in front of any route that requires payment.
 *
 * Flow:
 *   1. Require X-Wallet-Address (EVM address) — wallet = identity
 *   2. Require X-Payment header (tx hash of confirmed USDC payment on Base)
 *   3. Verify tx on-chain via Base RPC
 *   4. Replay protection: reject already-used tx hashes
 *   5. Record verified payment in identityDb
 *   6. Attach wallet + card to req for downstream handlers
 */
async function x402PaymentMiddleware(
  req: Request & { veklom?: { wallet: string; cardId: string } },
  res: Response,
  next: NextFunction
) {
  const callerWallet = getCallerWallet(req);
  if (!callerWallet) {
    return res.status(400).json({
      error: "Missing wallet identity.",
      message: "Provide your Base wallet address via X-Wallet-Address header.",
    });
  }

  const paymentHeader = req.headers["x-payment"] as string;
  if (!paymentHeader) {
    return send402(res, req.path);
  }

  // Basic tx hash format check
  if (!/^0x[a-fA-F0-9]{64}$/.test(paymentHeader)) {
    return res.status(400).json({
      error: "Invalid payment header format.",
      message: "X-Payment must be a valid Base transaction hash (0x + 64 hex chars).",
    });
  }

  // Replay protection — check if this tx hash already exists in db events
  const existingPayment = identityDb
    .getEvents()
    .find((e) => e.tx_hash === paymentHeader && e.event_type === "x402_payment_verified");

  if (existingPayment) {
    return res.status(400).json({
      error: "Payment already consumed.",
      message: "This transaction hash has already been used. Submit a new payment.",
    });
  }

  // On-chain verification
  const verification = await verifyPaymentOnChain(paymentHeader, req.path, callerWallet);
  if (!verification.valid) {
    return res.status(402).json({
      error: "Payment verification failed.",
      message: verification.error,
    });
  }

  // Resolve card (wallet = identity)
  const card = resolveCardByWallet(callerWallet);

  // Persist verified payment event
  identityDb.addEvent({
    agent_card_id: card.id,
    event_type: "x402_payment_verified",
    points_delta: 10,
    reason: `Verified x402 USDC payment on Base (eip155:8453) for ${req.path}. Block: ${verification.blockNumber}`,
    evidence_hash: paymentHeader,
    policy_id: null,
    mission_id: null,
    run_id: null,
    tx_hash: paymentHeader,
    created_at: new Date().toISOString(),
  });

  // Attach to request context for downstream handlers
  req.veklom = { wallet: callerWallet, cardId: card.id };

  return next();
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/x402/config
 * Public — returns merchant/payment configuration for clients and agents.
 */
router.get("/config", (_req: Request, res: Response) => {
  return res.json({
    success: true,
    chain: CHAIN_ID,
    merchant_wallet: MERCHANT_WALLET,
    usdc_contract: USDC_CONTRACT,
    prices: PRICES,
    spec: "https://x402.org",
  });
});

/**
 * GET /api/v1/x402/identity/premium
 * x402-gated: Returns full identity card for the paying wallet.
 * Cost: $0.01 USDC on Base
 */
router.get(
  "/identity/premium",
  x402PaymentMiddleware as any,
  (req: Request & { veklom?: { wallet: string; cardId: string } }, res: Response) => {
    const card = identityDb.findCardById(req.veklom!.cardId);
    return res.json({
      success: true,
      payment_status: "verified",
      chain: CHAIN_ID,
      wallet: req.veklom!.wallet,
      card,
    });
  }
);

/**
 * POST /api/v1/x402/benchmark/run
 * x402-gated: Triggers a benchmark run authenticated by wallet + payment.
 * Cost: $0.05 USDC on Base
 * Downstream: Wire to Iron Grid Benchmark service
 */
router.post(
  "/benchmark/run",
  x402PaymentMiddleware as any,
  (req: Request & { veklom?: { wallet: string; cardId: string } }, res: Response) => {
    const { benchmark_config } = req.body;
    // TODO: Call Iron Grid Benchmark service with wallet identity
    return res.json({
      success: true,
      payment_status: "verified",
      chain: CHAIN_ID,
      wallet: req.veklom!.wallet,
      benchmark_queued: true,
      benchmark_config: benchmark_config || null,
      message: "Benchmark run authorised and queued. Wire to Iron Grid runtime.",
    });
  }
);

/**
 * POST /api/v1/x402/discovery/feature
 * x402-gated: Unlocks a paid Discovery feature for the paying wallet.
 * Cost: $0.02 USDC on Base
 */
router.post(
  "/discovery/feature",
  x402PaymentMiddleware as any,
  (req: Request & { veklom?: { wallet: string; cardId: string } }, res: Response) => {
    const { feature_id } = req.body;
    return res.json({
      success: true,
      payment_status: "verified",
      chain: CHAIN_ID,
      wallet: req.veklom!.wallet,
      feature_id: feature_id || null,
      feature_unlocked: true,
    });
  }
);

/**
 * GET /api/v1/x402/ledger
 * Returns all verified x402 payment events (wallet + tx hashes).
 * Internal use / admin only — gate with internal token in production.
 */
router.get("/ledger", (_req: Request, res: Response) => {
  const payments = identityDb
    .getEvents()
    .filter((e) => e.event_type === "x402_payment_verified")
    .map((e) => ({
      tx_hash: e.tx_hash,
      wallet: identityDb.findCardById(e.agent_card_id)?.wallet_address || "unknown",
      reason: e.reason,
      created_at: e.created_at,
    }));

  return res.json({
    success: true,
    count: payments.length,
    payments,
  });
});

export { x402PaymentMiddleware };
export default router;
