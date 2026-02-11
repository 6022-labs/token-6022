# ADR-0002: Core Owner Controls Adapter Administration

- Status: Accepted
- Date: 2026-02-11
- Deciders: 6022 team

## Context

The bridge architecture separates:

1. Protocol-neutral bridge cores (`Token6022BridgeCoreCanonical`, `Token6022BridgeCoreSatellite`).
2. Transport adapters (CCIP and LayerZero).

Previously, adapter admin controls were tied to adapter-local ownership. This created a governance split-brain risk:

1. Core ownership could rotate while adapter ownership remained stale.
2. Old adapter owners could retain control over peer/options/delegate configuration.
3. Misaligned governance increased misconfiguration and abuse risk for cross-chain messaging.

For supply safety, the team wants one governance root for bridge authorization and transport configuration.

## Decision

Adapter administrative actions will be controlled by the **current core owner**.

1. CCIP adapter admin functions are gated by `core.owner()`.
2. LayerZero adapter admin functions (`setPeer`, `setLzSendOptions`) are gated by `core.owner()`.
3. Adapter constructors no longer take an external owner parameter.
4. LayerZero adapter is initialized with internal/self ownership/delegate, avoiding external stale-owner control on adapter-local onlyOwner paths.

## Implementation Notes

This decision is implemented in:

- `contracts/adapters/Token6022BridgeAdapterCCIP.sol`
- `contracts/adapters/Token6022BridgeAdapterLZ.sol`
- `contracts/interfaces/IToken6022BridgeCore/IToken6022BridgeCoreOwnable.sol`
- `contracts/interfaces/adapters/IToken6022BridgeAdapterCCIP/IToken6022BridgeAdapterCCIPErrors.sol`
- `contracts/interfaces/adapters/IToken6022BridgeAdapterLZ/IToken6022BridgeAdapterLZErrors.sol`

Deployment scripts were also updated for the new adapter constructors and safer authorization behavior:

- `deploy/Token6022BridgeAdapterCCIP.ts`
- `deploy/Token6022BridgeAdapterLZ.ts`

When deployer is not the current core owner, scripts do not attempt unauthorized `setAdapter` calls and emit guidance for owner execution.

## Consequences

### Positive

1. Core governance rotation automatically propagates to adapter admin authority.
2. Reduced risk of stale adapter owner/delegate retaining privileged transport control.
3. Single governance source of truth for adapter authorization and route configuration.

### Negative

1. This change does not remove governance trust:
   - If `core.owner` is compromised, an attacker can still reconfigure routes/adapters and impact funds/supply.

## Accepted Residual Risk

This ADR reduces split-governance risk but does not trust-minimize the bridge. A compromised core owner can still create high-impact outcomes by altering authorized adapters and messaging configuration.

## Alternatives Considered

1. Keep independent adapter owner:
   - Rejected due to ownership drift and stale-admin risk across rotations.

## Revisit Conditions

This ADR should be revisited if:

1. A trust-minimized proof model is introduced that reduces governance dependence.
2. Role-separation requirements emerge (for example dedicated guardian/governor model with constrained privileges).
