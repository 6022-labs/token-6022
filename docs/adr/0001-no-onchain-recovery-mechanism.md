# ADR-0001: Do Not Add Owner-Controlled Recovery/Finalize Mechanism

- Status: Accepted
- Date: 2026-02-11
- Deciders: 6022 team

## Context

We evaluated adding an on-chain recovery path for failed cross-chain transfers (for example `cancel/recover/finalize` functions callable by an owner/admin).

During review, the main concern was trust and supply safety:

1. An owner-controlled recovery path can become a privileged mint/unlock path.
2. Without trust-minimized destination proof, owner actions can compensate transfers that may still be deliverable later.
3. This increases the risk of supply inflation or governance abuse in a malicious/compromised owner scenario.

At the same time, CCIP and LayerZero already provide retry/re-execution mechanisms for many failed destination executions. We also confirmed replay protections are required and expected: replay reverts indicate a transfer was already processed, not missing value.

## Decision

6022 will **not** add an owner-controlled recovery/finalize mechanism in bridge core contracts at this stage.

Instead, 6022 will:

1. Rely on protocol retry/re-execution flows (CCIP and LayerZero) for transient failures.
2. Keep bridge processing idempotent (`transferId` and transport replay protection).
3. Enforce deployment/wiring controls in repository tasks before sending bridge transactions.

## Operational Mitigations

To reduce permanent-failure risk caused by misconfiguration, the send tooling enforces route checks before sending:

1. Adapter must be authorized on the selected core.
2. Route must exist in mesh config for the selected destination.
3. On-chain peer configuration must match expected remote adapter from config/deployments.

These checks are implemented in:

- `tasks/bridge-send.ts`
- `tasks/ccip-wire.ts`
- `tasks/lz-wire.ts`

## Consequences

### Positive

1. No privileged admin path to mint/unlock funds outside normal bridge message flow to reinforce supply safety.
2. Simpler and stricter trust model for users.
3. Lower governance/owner abuse surface.

### Negative

1. Some permanently failed outbound transfers can be irreversible for users.
2. Operations must maintain strict deployment/wiring discipline.

## Accepted Residual Risk

If a message is sent to an incorrect destination receiver/route, that specific message may be unrecoverable without a dedicated recovery design. This risk is accepted for now and mitigated through pre-send config validation and controlled deployment procedures.

## Alternatives Considered

1. Owner-only timeout-based recovery/cancel:
   - Rejected due to privileged mint/unlock risk and trust assumptions.
2. Owner-only outbound finalization marker:
   - Rejected as non-trust-minimized and difficult to justify without destination proof.

## Revisit Conditions

This ADR should be revisited if:

1. Permanent-failure user impact becomes material.
2. A trust-minimized proof/ack design is introduced that can prevent double-credit while enabling safe compensation.
