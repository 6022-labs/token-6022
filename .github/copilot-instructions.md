# Project Guidelines

## Code Style

- Solidity uses pragma ^0.8.22 with OZ 5.x patterns; see [contracts/Token6022.sol](contracts/Token6022.sol) and [hardhat.config.ts](hardhat.config.ts).
- TypeScript is strict, commonjs/es2020, and uses ethers v5 APIs; see [tsconfig.json](tsconfig.json) and [tasks/bridge-send.ts](tasks/bridge-send.ts).
- Match local formatting (quotes/semicolons) in the file you edit; deploy scripts often differ from tasks/tests.

## Architecture

- Canonical core locks/releases external ERC20; satellite core mints/burns its own supply; see [contracts/Token6022BridgeCoreCanonical.sol](contracts/Token6022BridgeCoreCanonical.sol) and [contracts/Token6022BridgeCoreSatellite.sol](contracts/Token6022BridgeCoreSatellite.sol).
- Transport adapters (LayerZero, CCIP) are optional and each wires to one core; see [contracts/adapters/Token6022BridgeAdapterLZ.sol](contracts/adapters/Token6022BridgeAdapterLZ.sol) and [contracts/adapters/Token6022BridgeAdapterCCIP.sol](contracts/adapters/Token6022BridgeAdapterCCIP.sol).

## Build and Test

- pnpm install
- npx hardhat compile
- npx hardhat test
- npm run lint (or lint:fix), npm run compile, npm run test from [package.json](package.json)

## Project Conventions

- Network config carries bridgeCore/bridgeAdapters settings used by deploy scripts; see [hardhat.config.ts](hardhat.config.ts).
- Deploy scripts use hardhat-deploy tags and may skip token deploy when tokenAddress is configured; see [deploy/Token6022.ts](deploy/Token6022.ts).
- Adapter deploys auto-authorize on the core via setAdapter; see [deploy/Token6022BridgeAdapterCCIP.ts](deploy/Token6022BridgeAdapterCCIP.ts) and [deploy/Token6022BridgeAdapterLZ.ts](deploy/Token6022BridgeAdapterLZ.ts).
- For adapter-only replacement, do not use `--reset` (it reruns dependencies); remove only the adapter deployment file and redeploy that adapter tag.
- Wiring tasks read root config files and apply idempotent peer/args updates; see [tasks/ccip-wire.ts](tasks/ccip-wire.ts) and [tasks/lz-wire.ts](tasks/lz-wire.ts).
- Bridge send task normalizes transfer IDs and handles approvals on canonical chains; see [tasks/bridge-send.ts](tasks/bridge-send.ts).

## Integration Points

- LayerZero topology in [layerzero.testnet.config.ts](layerzero.testnet.config.ts) and CCIP topology in [ccip.testnet.config.ts](ccip.testnet.config.ts).
- Hardhat tasks are registered in [hardhat.config.ts](hardhat.config.ts) and implemented in [tasks/](tasks/).

## Security

- Core enforces adapter authorization and replay protection; see [contracts/Token6022BridgeCoreBase.sol](contracts/Token6022BridgeCoreBase.sol).
- Adapters validate peers and fees per transport; see [contracts/adapters/Token6022BridgeAdapterLZ.sol](contracts/adapters/Token6022BridgeAdapterLZ.sol) and [contracts/adapters/Token6022BridgeAdapterCCIP.sol](contracts/adapters/Token6022BridgeAdapterCCIP.sol).
