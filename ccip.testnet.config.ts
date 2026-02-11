import {
  CcipPointHardhat,
  CcipTwoWayConfig,
  CcipOmniGraphHardhat,
  generateCcipConnectionsConfig,
} from "./tasks/ccip-config";

/**
 * Optional env overrides if Chainlink updates selectors in future environments.
 * Reference: https://docs.chain.link/cre/reference/sdk/evm-client-ts
 */
const CCIP_CHAIN_SELECTOR_BASE_TESTNET =
  process.env.CCIP_CHAIN_SELECTOR_BASE_TESTNET ?? "10344971235874465080";
const CCIP_CHAIN_SELECTOR_AMOY_TESTNET =
  process.env.CCIP_CHAIN_SELECTOR_AMOY_TESTNET ?? "16281711391670634445";

const baseTestnetContract: CcipPointHardhat = {
  network: "base-testnet",
  chainSelector: CCIP_CHAIN_SELECTOR_BASE_TESTNET,
  contractName: "Token6022BridgeAdapterCCIP",
};

const amoyTestnetContract: CcipPointHardhat = {
  network: "amoy-testnet",
  chainSelector: CCIP_CHAIN_SELECTOR_AMOY_TESTNET,
  contractName: "Token6022BridgeAdapterCCIP",
};

const DEFAULT_CCIP_EXTRA_ARGS = "0x";

const pathways: CcipTwoWayConfig[] = [
  [
    baseTestnetContract,
    amoyTestnetContract,
    [DEFAULT_CCIP_EXTRA_ARGS, DEFAULT_CCIP_EXTRA_ARGS],
  ],
];

export default async function (): Promise<CcipOmniGraphHardhat> {
  const connections = generateCcipConnectionsConfig(pathways);

  return {
    contracts: [
      {
        contract: baseTestnetContract,
      },
      {
        contract: amoyTestnetContract,
      },
    ],
    connections,
  };
}
