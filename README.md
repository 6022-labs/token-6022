# 6022 Token Contracts

This repository contains the 6022 token contracts, deployment scripts, and tests. It uses Hardhat + `hardhat-deploy` and supports bridging through both LayerZero V2 and Chainlink CCIP.

## Architecture

- Canonical chain (Polygon Amoy): `Token6022` + `Token6022BridgeAdapter`.
  - Bridge-out: lock on adapter.
  - Bridge-in: unlock from adapter.
- Satellite chains: `Token6022BridgeToken`.
  - Bridge-out: burn.
  - Bridge-in: mint.

This keeps a fixed global supply model: canonical liquidity is locked/unlocked, satellites are mint/burn representations.

## Contracts

- `contracts/Token6022.sol`: canonical ERC20 token (`6022`) with initial supply mint.
- `contracts/Token6022BridgeAdapter.sol`: canonical lock/unlock bridge endpoint for LayerZero + CCIP.
- `contracts/Token6022BridgeToken.sol`: satellite mint/burn bridge endpoint for LayerZero + CCIP.

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env`:

```bash
PRIVATE_KEY=0xabc...def
RPC_URL_AMOY_TESTNET=
RPC_URL_BASE_TESTNET=
CCIP_ROUTER_AMOY_TESTNET=
CCIP_ROUTER_BASE_TESTNET=
```

3. Review `hardhat.config.ts`:
- `oftAdapter.tokenAddress` must exist only on canonical networks.
- `ccipRouter` must be set on every network where dual-bridge contracts are deployed.

## Bridge Configuration

### LayerZero

- Topology is configured in `layerzero.testnet.config.ts`.
- Deploy with:

```bash
npx hardhat lz:deploy --tags Token6022BridgeToken,Token6022BridgeAdapter
```

### CCIP

- There is no separate mesh config file like LayerZero's graph config.
- CCIP connectivity is configured on-chain by owner calls:
  - `setCcipPeer(uint64 chainSelector, address peer)`
  - `setCcipExtraArgs(uint64 chainSelector, bytes extraArgs)` (optional)
- Sending uses:
  - `sendWithCcip(...)` on `Token6022BridgeAdapter` (lock/unlock path)
  - `sendWithCcip(...)` on `Token6022BridgeToken` (mint/burn path)

## Build and Test

```bash
npx hardhat compile
npx hardhat test
```

Tests cover ERC20 behaviour, LayerZero OFT paths, and CCIP lock/unlock + mint/burn paths.
