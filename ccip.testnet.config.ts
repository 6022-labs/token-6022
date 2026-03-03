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
const CCIP_CHAIN_SELECTOR_ADI_TESTNET =
  process.env.CCIP_CHAIN_SELECTOR_ADI_TESTNET ?? "9418205736192840573";
const CCIP_CHAIN_SELECTOR_AMOY_TESTNET =
  process.env.CCIP_CHAIN_SELECTOR_AMOY_TESTNET ?? "16281711391670634445";
const CCIP_CHAIN_SELECTOR_CITREA_TESTNET =
  process.env.CCIP_CHAIN_SELECTOR_CITREA_TESTNET;
const CCIP_CHAIN_SELECTOR_BASE_SEPOLIA_TESTNET =
  process.env.CCIP_CHAIN_SELECTOR_BASE_SEPOLIA_TESTNET ??
  "10344971235874465080";
const CCIP_CHAIN_SELECTOR_ETHEREUM_SEPOLIA_TESTNET =
  process.env.CCIP_CHAIN_SELECTOR_ETHEREUM_SEPOLIA_TESTNET ??
  "16015286601757825753";

const adiTestnetContract: CcipPointHardhat = {
  network: "adi-testnet",
  chainSelector: CCIP_CHAIN_SELECTOR_ADI_TESTNET,
  contractName: "Token6022BridgeAdapterCCIP",
};

const amoyTestnetContract: CcipPointHardhat = {
  network: "amoy-testnet",
  chainSelector: CCIP_CHAIN_SELECTOR_AMOY_TESTNET,
  contractName: "Token6022BridgeAdapterCCIP",
};

// Note: Citrea testnet CCIP chain selector not yet publicly documented
// Uncomment and set CCIP_CHAIN_SELECTOR_CITREA_TESTNET env var when available
// const citreaTestnetContract: CcipPointHardhat = {
//   network: "citrea-testnet",
//   chainSelector: CCIP_CHAIN_SELECTOR_CITREA_TESTNET ?? "",
//   contractName: "Token6022BridgeAdapterCCIP",
// };

const baseSepoliaTestnetContract: CcipPointHardhat = {
  network: "base-sepolia-testnet",
  chainSelector: CCIP_CHAIN_SELECTOR_BASE_SEPOLIA_TESTNET,
  contractName: "Token6022BridgeAdapterCCIP",
};

const ethereumSepoliaTestnetContract: CcipPointHardhat = {
  network: "ethereum-sepolia-testnet",
  chainSelector: CCIP_CHAIN_SELECTOR_ETHEREUM_SEPOLIA_TESTNET,
  contractName: "Token6022BridgeAdapterCCIP",
};

const DEFAULT_CCIP_EXTRA_ARGS = "0x";

const pathways: CcipTwoWayConfig[] = [
  [
    baseSepoliaTestnetContract,
    amoyTestnetContract,
    [DEFAULT_CCIP_EXTRA_ARGS, DEFAULT_CCIP_EXTRA_ARGS],
  ],
  [
    adiTestnetContract,
    baseSepoliaTestnetContract,
    [DEFAULT_CCIP_EXTRA_ARGS, DEFAULT_CCIP_EXTRA_ARGS],
  ],
  [
    adiTestnetContract,
    amoyTestnetContract,
    [DEFAULT_CCIP_EXTRA_ARGS, DEFAULT_CCIP_EXTRA_ARGS],
  ],
  // Uncomment when citreaTestnetContract is supported by CCIP:
  // [
  //   adiTestnetContract,
  //   citreaTestnetContract,
  //   [DEFAULT_CCIP_EXTRA_ARGS, DEFAULT_CCIP_EXTRA_ARGS],
  // ],
  // [
  //   amoyTestnetContract,
  //   citreaTestnetContract,
  //   [DEFAULT_CCIP_EXTRA_ARGS, DEFAULT_CCIP_EXTRA_ARGS],
  // ],
  // [
  //   baseTestnetContract,
  //   citreaTestnetContract,
  //   [DEFAULT_CCIP_EXTRA_ARGS, DEFAULT_CCIP_EXTRA_ARGS],
  // ],
  // [
  //   citreaTestnetContract,
  //   sepoliaTestnetContract,
  //   [DEFAULT_CCIP_EXTRA_ARGS, DEFAULT_CCIP_EXTRA_ARGS],
  // ],
  [
    ethereumSepoliaTestnetContract,
    baseSepoliaTestnetContract,
    [DEFAULT_CCIP_EXTRA_ARGS, DEFAULT_CCIP_EXTRA_ARGS],
  ],
  [
    ethereumSepoliaTestnetContract,
    amoyTestnetContract,
    [DEFAULT_CCIP_EXTRA_ARGS, DEFAULT_CCIP_EXTRA_ARGS],
  ],
  [
    ethereumSepoliaTestnetContract,
    adiTestnetContract,
    [DEFAULT_CCIP_EXTRA_ARGS, DEFAULT_CCIP_EXTRA_ARGS],
  ],
];

export default async function (): Promise<CcipOmniGraphHardhat> {
  const connections = generateCcipConnectionsConfig(pathways);

  return {
    contracts: [
      {
        contract: adiTestnetContract,
      },
      {
        contract: baseSepoliaTestnetContract,
      },
      {
        contract: amoyTestnetContract,
      },
      // Uncomment when citreaTestnetContract is supported by CCIP:
      // {
      //   contract: citreaTestnetContract,
      // },
      {
        contract: ethereumSepoliaTestnetContract,
      },
    ],
    connections,
  };
}
