# 6022 Token Contracts

This repository contains the 6022 token contracts, deployment scripts, and tests. It uses Hardhat + `hardhat-deploy` with a protocol-neutral bridge core and optional LayerZero / CCIP adapters.

## Architecture

- `Token6022BridgeCoreCanonical`: protocol-neutral lock/release core for canonical chain liquidity.
- `Token6022BridgeCoreSatellite`: protocol-neutral mint/burn ERC20 core for satellite chains.
- `Token6022BridgeAdapterLZ`: optional LayerZero transport adapter wired to one core.
- `Token6022BridgeAdapterCCIP`: optional Chainlink CCIP transport adapter wired to one core.

With this split, core deployment is protocol-agnostic, and each transport can be deployed/wired independently.

## Contracts

- `contracts/Token6022.sol`: canonical ERC20 token (`6022`) with initial supply mint.
- `contracts/Token6022BridgeCoreCanonical.sol`: canonical protocol-neutral core.
- `contracts/Token6022BridgeCoreSatellite.sol`: satellite protocol-neutral core token.
- `contracts/adapters/Token6022BridgeAdapterLZ.sol`: optional LayerZero transport adapter.
- `contracts/adapters/Token6022BridgeAdapterCCIP.sol`: optional CCIP transport adapter.

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

# https://docs.chain.link/cre/reference/sdk/evm-client-ts
CCIP_CHAIN_SELECTOR_AMOY_TESTNET=16281711391670634445
CCIP_CHAIN_SELECTOR_BASE_TESTNET=10344971235874465080

# Governance owners (Safe/timelock addresses)
BRIDGE_OWNER_AMOY_TESTNET=
BRIDGE_OWNER_BASE_TESTNET=
```

3. Review `hardhat.config.ts`:

- `bridgeCore.type` controls whether a network deploys canonical or satellite core.
- `bridgeCore.tokenAddress` is required for canonical core.
- `bridgeAdapters.lz` controls optional LZ adapter deployment.
- `bridgeAdapters.ccip.router` controls optional CCIP adapter deployment.
- `bridgeGovernance.owner` (or `BRIDGE_OWNER_*` env vars in `hardhat.config.ts`) sets the owner for bridge core contracts. Adapter admin actions are gated by the current core owner.

## Bridge Configuration

### 1) Deploy core (protocol-neutral)

```bash
npx hardhat deploy --network amoy-testnet --tags Token6022BridgeCoreCanonical
npx hardhat deploy --network base-testnet --tags Token6022BridgeCoreSatellite
```

### 2) Deploy adapters (optional, per transport)

```bash
npx hardhat deploy --network amoy-testnet --tags Token6022BridgeAdapterLZ
npx hardhat deploy --network base-testnet --tags Token6022BridgeAdapterLZ

npx hardhat deploy --network amoy-testnet --tags Token6022BridgeAdapterCCIP
npx hardhat deploy --network base-testnet --tags Token6022BridgeAdapterCCIP
```

Adapter deploy scripts automatically authorize the deployed adapter on the local core via `setAdapter(adapter, true)`.
When `bridgeGovernance.owner` is different from the deployer (for example a Safe), auto-authorization is skipped and must be executed by the configured owner.

### 3) Wire LayerZero (optional)

- Topology is configured in `layerzero.testnet.config.ts`.
- Apply wiring per source network:

```bash
npx hardhat lz:wire --network amoy-testnet --lz-config layerzero.testnet.config.ts
npx hardhat lz:wire --network base-testnet --lz-config layerzero.testnet.config.ts
```

### 4) Wire CCIP (optional)

- Topology is configured in `ccip.testnet.config.ts`.
- Apply CCIP wiring from that config on each source network:

```bash
npx hardhat ccip:wire --network amoy-testnet --ccip-config ccip.testnet.config.ts
npx hardhat ccip:wire --network base-testnet --ccip-config ccip.testnet.config.ts
```

- Dry-run mode:

```bash
npx hardhat ccip:wire --network amoy-testnet --ccip-config ccip.testnet.config.ts --dry-run
```

- Under the hood this writes:
  - `setCcipPeer(uint64 chainSelector, bytes peer)` (EVM adapters use `abi.encode(address)`)
  - `setCcipExtraArgs(uint64 chainSelector, bytes extraArgs)` (when configured)
- Sending uses:
  - `sendWithLz(...)` on `Token6022BridgeAdapterLZ`
  - `sendWithCcip(...)` on `Token6022BridgeAdapterCCIP`

### 5) Send bridge transfers (optional)

LayerZero:

```bash
npx hardhat lz:send \
  --network amoy-testnet \
  --dst-eid 40245 \
  --to 0xYourRecipient \
  --amount 1
```

CCIP:

```bash
npx hardhat ccip:send \
  --network amoy-testnet \
  --dst-chain-selector 10344971235874465080 \
  --to 0xYourRecipient \
  --amount 1
```

Notes:

- Both tasks auto-generate a `transferId` unless you pass `--transfer-id`.
- Both tasks auto-approve canonical token allowance to `Token6022BridgeCoreCanonical` if needed.
- `lz:send` uses `--options 0x` by default, which falls back to stored `lzSendOptions`.

## Build and Test

```bash
npx hardhat compile
npx hardhat test
```

Current tests cover ERC20 behavior and bridge flows for canonical/satellite cores and both adapters.
