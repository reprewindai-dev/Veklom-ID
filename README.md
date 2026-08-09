> [!IMPORTANT]
> **VEKLOM BIBLE — READ FIRST:** [`00_VEKLOM_BIBLE.md`](./00_VEKLOM_BIBLE.md)
> It supersedes older cross-repo architecture/deployment/alignment claims wherever they conflict.

# Veklom ID

Veklom ID is the identity and trust layer for Veklom-operated products and machine clients.

It provides a stable operator identity card, wallet linking, event-backed trust scoring, public-safe score lookup, internal service event ingestion, and x402-linked identity evidence.

## What this service owns

- Canonical operator identity cards
- Wallet-to-identity linking
- Trust-score events and score history
- Public-safe identity lookup
- Internal authenticated identity event ingestion
- Identity-side x402 evidence hooks

It does **not** own generic multi-agent simulation, application gameplay, or product-specific business logic.

## API surface

Public identity routes are mounted under:

```text
/api/v1/identity
```

Trusted service routes are mounted under:

```text
/api/v1/internal/identity
```

The internal mount requires `VEKLOM_INTERNAL_TOKEN` for privileged event submission and test operations.

x402 identity integration is mounted under:

```text
/api/v1/x402
```

## Local development

```bash
npm install
npm run dev
```

Required production configuration is supplied through deployment environment variables. Do not commit API keys, service tokens, wallet secrets, or deployment credentials to the repository.

## Product principle

A Veklom identity score must come from recorded, attributable events and verifiable evidence. Static demo scores, fabricated endorsements, or unverified payment claims must never be presented as production identity evidence.
