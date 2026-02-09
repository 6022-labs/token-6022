import { EndpointId } from "@layerzerolabs/lz-definitions";

import {
  LzPointHardhat,
  LzTwoWayConfig,
  LzOmniGraphHardhat,
  generateLzConnectionsConfig,
} from "./tasks/lzConfig";

const baseTestnetContract: LzPointHardhat = {
  network: "base-testnet",
  eid: EndpointId.BASESEP_V2_TESTNET,
  contractName: "Token6022BridgeAdapterLZ",
};

const amoyTestnetContract: LzPointHardhat = {
  network: "amoy-testnet",
  eid: EndpointId.AMOY_V2_TESTNET,
  contractName: "Token6022BridgeAdapterLZ",
};

const DEFAULT_LZ_OPTIONS = "0x";

const pathways: LzTwoWayConfig[] = [
  [
    baseTestnetContract,
    amoyTestnetContract,
    [DEFAULT_LZ_OPTIONS, DEFAULT_LZ_OPTIONS],
  ],
];

export default async function (): Promise<LzOmniGraphHardhat> {
  const connections = generateLzConnectionsConfig(pathways);

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
