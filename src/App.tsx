import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Copy,
  ExternalLink,
  Fingerprint,
  Link2,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

interface AgentCard {
  id: string;
  wallet_address: string | null;
  display_name: string;
  trust_score: number;
  operator_rank: string;
  current_streak: number;
  completed_missions: number;
  verified_actions: number;
  successful_agent_runs: number;
  policy_violations: number;
  governance_proofs_generated: number;
  last_score_event_at: string | null;
  score_version: number;
}

interface TrustEvent {
  id: string;
  event_type: string;
  points_delta: number;
  reason: string;
  evidence_hash: string | null;
  tx_hash: string | null;
  created_at: string;
}

function short(value?: string | null, size = 8) {
  if (!value) return "—";
  if (value.length <= size * 2 + 3) return value;
  return `${value.slice(0, size)}…${value.slice(-size)}`;
}

async function jsonFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || body?.detail || `HTTP ${response.status}`);
  }
  return body;
}

export default function App() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const [card, setCard] = useState<AgentCard | null>(null);
  const [events, setEvents] = useState<TrustEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>("");
  const [displayName, setDisplayName] = useState("");

  const [lookupAddress, setLookupAddress] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);

  const [capabilityId, setCapabilityId] = useState("repogate-scan");
  const [parametersText, setParametersText] = useState("{}");
  const [paymentProof, setPaymentProof] = useState("");
  const [challenge, setChallenge] = useState<any>(null);
  const [execution, setExecution] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const [x402Busy, setX402Busy] = useState(false);

  const loadIdentity = useCallback(async () => {
    setLoading(true);
    try {
      const [me, history] = await Promise.all([
        jsonFetch("/api/v1/identity/me"),
        jsonFetch("/api/v1/identity/events"),
      ]);
      setCard(me.card);
      setDisplayName(me.card?.display_name || "");
      setEvents(history.events || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load identity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  useEffect(() => {
    if (!isConnected || !address || !card) return;
    if (card.wallet_address?.toLowerCase() === address.toLowerCase()) return;

    jsonFetch("/api/v1/identity/link-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet_address: address }),
    })
      .then((body) => setCard(body.card))
      .catch((error) => setMessage(`Wallet link failed: ${error.message}`));
  }, [address, card, isConnected]);

  const saveProfile = async () => {
    try {
      const body = await jsonFetch("/api/v1/identity/link-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName }),
      });
      setCard(body.card);
      setMessage("Identity profile updated.");
    } catch (error: any) {
      setMessage(error.message);
    }
  };

  const lookup = async () => {
    setLookupResult(null);
    try {
      setLookupResult(await jsonFetch(`/api/v1/identity/score/${encodeURIComponent(lookupAddress.trim())}`));
    } catch (error: any) {
      setLookupResult({ error: error.message });
    }
  };

  const parsedParameters = useMemo(() => {
    try {
      return JSON.parse(parametersText || "{}");
    } catch {
      return null;
    }
  }, [parametersText]);

  const requestChallenge = async () => {
    if (!parsedParameters) {
      setMessage("Capability parameters must be valid JSON.");
      return;
    }
    setX402Busy(true);
    setChallenge(null);
    setExecution(null);
    setVerification(null);
    try {
      const response = await fetch("/api/v1/x402/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capability_id: capabilityId, parameters: parsedParameters }),
      });
      const body = await response.json();
      if (response.status !== 402) throw new Error(body?.error || `Expected 402, received ${response.status}`);
      setChallenge(body);
      setMessage("Canonical payment challenge received.");
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setX402Busy(false);
    }
  };

  const executePaid = async () => {
    if (!parsedParameters) {
      setMessage("Capability parameters must be valid JSON.");
      return;
    }
    if (!paymentProof.trim()) {
      setMessage("Paste the real payment proof before executing.");
      return;
    }

    setX402Busy(true);
    setExecution(null);
    setVerification(null);
    try {
      const body = await jsonFetch("/api/v1/x402/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capability_id: capabilityId,
          parameters: parsedParameters,
          payment_proof: paymentProof.trim(),
          challenge_id: challenge?.challenge?.challenge_id,
        }),
      });
      setExecution(body);

      const verified = await jsonFetch("/api/v1/x402/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt_id: body.receipt_id,
          proof_hash: body.proof_hash,
          evidence_hash: body.evidence_hash,
        }),
      });
      setVerification(verified);
      setMessage(verified.valid ? "Paid capability executed and evidence verified." : "Execution returned, but evidence verification failed.");
      await loadIdentity();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setX402Busy(false);
    }
  };

  const copy = (value?: string | null) => {
    if (value) navigator.clipboard?.writeText(value);
  };

  if (loading) {
    return <main className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center"><RefreshCw className="animate-spin" /></main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-5 py-8 space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold uppercase tracking-[0.2em]"><Fingerprint size={17} /> Veklom ID</div>
            <h1 className="mt-2 text-3xl font-semibold">Identity earned from evidence.</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Wallet linkage is identity context. Trust is earned only from authenticated service events and verifiable execution evidence.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isConnected ? (
              <button onClick={() => disconnect()} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">{short(address)} · Disconnect</button>
            ) : connectors.length ? (
              <button disabled={isPending} onClick={() => connect({ connector: connectors[0] })} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"><Wallet className="inline mr-2" size={16} />{isPending ? "Connecting…" : "Connect wallet"}</button>
            ) : null}
            <button onClick={loadIdentity} className="rounded-lg border border-slate-700 px-3 py-2"><RefreshCw size={16} /></button>
          </div>
        </header>

        {message && <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">{message}</div>}

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Trust score" value={String(card?.trust_score ?? 0)} icon={<ShieldCheck size={17} />} />
          <Metric label="Rank" value={card?.operator_rank || "Unverified"} icon={<Fingerprint size={17} />} />
          <Metric label="Verified actions" value={String(card?.verified_actions ?? 0)} icon={<CheckCircle2 size={17} />} />
          <Metric label="Policy violations" value={String(card?.policy_violations ?? 0)} icon={<XCircle size={17} />} />
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Panel title="Identity card" icon={<Fingerprint size={18} />}>
            <div className="space-y-3 text-sm">
              <label className="block text-slate-400">Display name</label>
              <div className="flex gap-2">
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                <button onClick={saveProfile} className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-950">Save</button>
              </div>
              <Row label="Wallet" value={card?.wallet_address || "Not linked"} copyValue={card?.wallet_address} onCopy={copy} />
              <Row label="Score version" value={String(card?.score_version ?? 0)} />
              <Row label="Last evidence event" value={card?.last_score_event_at ? new Date(card.last_score_event_at).toLocaleString() : "None yet"} />
            </div>
          </Panel>

          <Panel title="Public score lookup" icon={<Search size={18} />}>
            <p className="mb-3 text-sm text-slate-400">Inspect the public-safe identity view for a wallet address.</p>
            <div className="flex gap-2">
              <input value={lookupAddress} onChange={(e) => setLookupAddress(e.target.value)} placeholder="0x…" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm" />
              <button onClick={lookup} className="rounded-lg border border-slate-700 px-4 py-2">Lookup</button>
            </div>
            {lookupResult && <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-slate-300">{JSON.stringify(lookupResult, null, 2)}</pre>}
          </Panel>
        </section>

        <Panel title="Evidence history" icon={<Activity size={18} />}>
          {events.length === 0 ? (
            <p className="text-sm text-slate-400">No trust-bearing events yet. New identities correctly begin unverified.</p>
          ) : (
            <div className="divide-y divide-slate-800">
              {events.slice(0, 20).map((event) => (
                <div key={event.id} className="grid gap-2 py-3 md:grid-cols-[180px_80px_1fr_180px] md:items-center text-sm">
                  <div className="font-mono text-xs text-slate-400">{event.event_type}</div>
                  <div className={event.points_delta >= 0 ? "text-emerald-400" : "text-red-400"}>{event.points_delta >= 0 ? "+" : ""}{event.points_delta}</div>
                  <div>{event.reason}</div>
                  <button onClick={() => copy(event.evidence_hash || event.tx_hash)} className="text-left font-mono text-xs text-slate-500 hover:text-slate-300">{short(event.evidence_hash || event.tx_hash, 10)} {event.evidence_hash || event.tx_hash ? <Copy className="inline" size={12} /> : null}</button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Paid capability verification" icon={<Zap size={18} />}>
          <p className="mb-4 text-sm text-slate-400">This is the real x402 path: obtain the canonical challenge, pay externally with the supported wallet/client, execute with the proof, then verify the persisted receipt/evidence binding.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">Capability ID<input value={capabilityId} onChange={(e) => setCapabilityId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono" /></label>
            <label className="text-sm">Payment proof<input value={paymentProof} onChange={(e) => setPaymentProof(e.target.value)} placeholder="real x402 proof / tx authorization" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono" /></label>
          </div>
          <label className="mt-3 block text-sm">Parameters JSON<textarea value={parametersText} onChange={(e) => setParametersText(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs" /></label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={x402Busy} onClick={requestChallenge} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Get payment challenge</button>
            <button disabled={x402Busy || !challenge} onClick={executePaid} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">Execute + verify</button>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <ProofBox title="Challenge" value={challenge} />
            <ProofBox title="Execution" value={execution} />
            <ProofBox title="Verification" value={verification} />
          </div>
        </Panel>
      </div>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">{icon}{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></div>;
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="mb-4 flex items-center gap-2 font-semibold">{icon}{title}</h2>{children}</section>;
}

function Row({ label, value, copyValue, onCopy }: { label: string; value: string; copyValue?: string | null; onCopy: (value?: string | null) => void }) {
  return <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-3"><span className="text-slate-500">{label}</span><button disabled={!copyValue} onClick={() => onCopy(copyValue)} className="max-w-[70%] truncate font-mono text-xs text-slate-300">{value}{copyValue ? <Copy className="ml-2 inline" size={12} /> : null}</button></div>;
}

function ProofBox({ title, value }: { title: string; value: any }) {
  return <div className="min-h-40 rounded-lg border border-slate-800 bg-black/20 p-3"><div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</div>{value ? <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all text-[11px] text-slate-300">{JSON.stringify(value, null, 2)}</pre> : <p className="text-xs text-slate-600">No data yet.</p>}</div>;
}
