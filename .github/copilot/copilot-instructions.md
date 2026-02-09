# GitHub Copilot Instructions

## Priority Guidelines

When generating code for this repository:

1. Version compatibility: use the exact language and library versions observed in this codebase.
2. Context files: if this directory gains additional files later, follow those first.
3. Codebase patterns: mirror naming, structure, and error handling from nearby files.
4. Architecture: preserve the canonical vs satellite bridge model described below.
5. Code quality: prioritize maintainability, security, and testability as demonstrated in existing files.

## Technology Versions (Observed)

Use these versions and avoid features outside them:

- Node.js: v18.18.0 in .nvmrc, engines >=18.16.0 in package.json.
- TypeScript: 5.9.3.
- Hardhat: 2.28.0.
- Ethers: 5.7.2 (ethers v5 APIs like ethers.utils.parseUnits).
- Solidity: 0.8.22.
- OpenZeppelin Contracts: 5.4.0.
- hardhat-deploy: 1.0.4.
- mocha: 11.7.5, chai: 4.4.1.
- LayerZero toolchain: @layerzerolabs/toolbox-hardhat 0.6.13, oft-evm 4.0.1, lz-definitions 3.0.151, lz-v2-utilities 3.0.151.

## Architecture and Domain Model

- Canonical chain (Polygon Amoy): Token6022 + Token6022BridgeAdapter.
  - Bridge-out: lock on adapter.
  - Bridge-in: unlock from adapter.
- Satellite chains: Token6022BridgeToken.
  - Bridge-out: burn.
  - Bridge-in: mint.
- LayerZero topology configured in layerzero.testnet.config.ts.
- CCIP connectivity configured on-chain via setCcipPeer and setCcipExtraArgs.

Do not introduce patterns that break the fixed global supply model (lock/unlock vs mint/burn).

## Solidity Guidelines

- Use pragma ^0.8.22 and match the minimal, direct style in existing contracts.
- Imports are from OpenZeppelin where appropriate, e.g. ERC20.
- Constructors set token name/symbol and mint initial supply in the canonical token.
- Use 4-space indentation, braces on same line, and keep contracts small and focused.
- Do not add extra libraries or complex inheritance unless already present in similar contracts.

## TypeScript Guidelines

- TypeScript is strict; keep types explicit when needed.
- Module target is commonjs, and target is es2020.
- Prefer single quotes and no semicolons in tasks, tests, and deploy scripts.
- Hardhat config uses semicolons and double quotes; follow the existing file style where you edit.
- Use hardhat-deploy DeployFunction pattern in deploy scripts.
- Read from environment variables using dotenv/config in hardhat.config.ts.

## Testing Patterns

- Tests use mocha + chai and hardhat-network-helpers.
- Structure uses describe('When ...'), it('Should ...').
- Use ethers v5 and TypeChain types from typechain-types.
- Use loadFixture and reset for clean, deterministic tests.

## Deploy and Task Patterns

- Deploy scripts live in deploy/ and use hardhat-deploy.
- Use assert for required named accounts and log with console.log and console.warn.
- Skip deployments when network config provides an existing token address.
- Tasks live in tasks/ and can import shared utils from tasks/utils.ts.

## General Best Practices

- Follow naming conventions as seen: Token6022, Token6022BridgeAdapter, Token6022BridgeToken.
- Keep changes consistent with existing file formatting and structure.
- Prefer consistency with existing patterns over introducing new abstractions.
