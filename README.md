# 6022 Token Contracts

This repository holds the 6022 token contracts, deployment scripts, and tests. It targets Polygon Amoy as the home chain, uses Hardhat with `hardhat-deploy`, and integrates LayerZero V2 for cross-chain messaging.

## Components

- **Token6022** (`contracts/Token6022.sol`): ERC20 token with symbol `6022`. The deployment script mints `1_000_000_000` tokens (18 decimals) to the deployer.
- **Token6022OFT** (`contracts/Token6022OFT.sol`): Native LayerZero Omnichain Fungible Token (OFT) implementation. It is ownable by the deployer and starts with zero total supply, relying on cross-chain credits.
- **Token6022OFTAdapter** (`contracts/Token6022OFTAdapter.sol`): Adapter that exposes an already-deployed ERC20 (such as `Token6022`) as an OFT without migrating balances.

Deployment scripts in `deploy/` use `hardhat-deploy` tags that match the contract names. Tests in `test/` cover ERC20 behaviour, allowance flows, and OFT cross-chain transfers with mocked LayerZero endpoints. Token6022 and Token6022OFTAdapter are currently live on Polygon Amoy.

## Setup

1. Install dependencies: `pnpm install`
2. Create `.env` with the deployer key (and optional RPC URLs):

	```
	PRIVATE_KEY=0xabc...def
	```

3. Review `hardhat.config.ts`:
	- Polygon Amoy includes the live Token6022 and adapter addresses.
	- Provide `eid`, `url`, and `accounts` for every LayerZero-enabled network.
	- Set `oftAdapter.tokenAddress` only on networks that already host the ERC20.
4. Adjust `layerzero.testnet.config.ts` if you need a different omnichain mesh (default links Amoy, Avalanche Fuji, and Sepolia).

## Build & Test

```bash
npx hardhat compile
npx hardhat test
```

The suite verifies deployment supply, transfers, approvals, and OFT cross-chain behaviour via mocked endpoints.

## Deployments

Use the LayerZero deployment task to orchestrate omnichain deployments defined in your config:

```bash
npx hardhat lz:deploy --tags Token6022OFT,Token6022OFTAdapter
npx hardhat lz:deploy --help
```

Ensure `oftAdapter.tokenAddress` is populated on networks that already host Token6022, and configure peers after deployment (for example `npx hardhat lz:set-knit ...`).

## Useful Hardhat tasks

- `npx hardhat accounts`
- `npx hardhat compile --force`
- `npx hardhat clean`

## Troubleshooting

- Ensure EndpointV2 mocks or addresses are deployed before running OFT tests or deployments.
- The adapter script skips execution when no `oftAdapter.tokenAddress` is provided for the current network.
- If tests fail with insufficient gas, delete `cache/` and `artifacts/`, then recompile.

For detailed LayerZero documentation see the [LayerZero developer portal](https://layerzero.network/developers).
